import { useMapInitialization } from '@/components/map-display/hooks/useMapInitialization'
import { MAP_SETTINGS } from '@/components/map-display/types'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

import { Button } from '@/components/ui/button'
import { debounce } from '@/lib/debounce'
import type { Rectangle } from '@ritchy/types'
import { Search } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

const DEBUG = false

const debugLog = (...args: unknown[]) => {
  if (DEBUG) {
    console.log('[MapBox]', ...args)
  }
}

type center = {
  latitude: number
  longitude: number
}

type bounds = {
  northEast: center
  southWest: center
}

export type Location = {
  center: center
  bounds: bounds
}

// Improve props interface with more specific types
interface MapBoxProps {
  onLocationChange: (location: Location) => void
  userLocation: Location
  onSearchArea: () => void
  searchInfo: {
    keyword: string
    placeName: string
    model: string
  }
  isLoading?: boolean
}

const calculateAspectRatioBounds = (map: mapboxgl.Map) => {
  const bounds = map.getBounds()
  if (!bounds) return null
  const ne = bounds.getNorthEast()
  const sw = bounds.getSouthWest()

  // Get container dimensions
  const { width, height } = map.getContainer().getBoundingClientRect()
  const isPortrait = height > width

  if (isPortrait) {
    // For portrait (mobile), adjust the longitude bounds to match height/width ratio
    const lat = ne.lat - sw.lat
    const lng = ne.lng - sw.lng
    const targetRatio = width / height

    // Adjust longitude spread to match container ratio
    const newLngSpread = lat * targetRatio
    const lngDiff = (newLngSpread - lng) / 2

    return new mapboxgl.LngLatBounds(
      [sw.lng - lngDiff, sw.lat],
      [ne.lng + lngDiff, ne.lat],
    )
  }

  return bounds
}

export const SearchMap: FC<MapBoxProps> = ({
  onLocationChange,
  userLocation,
  onSearchArea,
  searchInfo,
  isLoading: propIsLoading,
}) => {
  debugLog('MapBox render:', { userLocation })

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const centerMarkerRef = useRef<mapboxgl.Marker | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const initialCenter = useMemo(() => {
    debugLog('Calculating initial center:', userLocation)
    return [userLocation.center.longitude, userLocation.center.latitude] as [
      number,
      number,
    ]
  }, [userLocation.center.latitude, userLocation.center.longitude])

  const mapRef = useMapInitialization(
    mapContainerRef,
    initialCenter,
    MAP_SETTINGS,
  )

  // Record user activity
  useEffect(() => {
    const recordActivity = () => {
      localStorage.setItem('lastMapActivity', Date.now().toString())
    }

    window.addEventListener('mousemove', recordActivity)
    window.addEventListener('keydown', recordActivity)
    window.addEventListener('touchstart', recordActivity)

    return () => {
      window.removeEventListener('mousemove', recordActivity)
      window.removeEventListener('keydown', recordActivity)
      window.removeEventListener('touchstart', recordActivity)
    }
  }, [])

  // Resize observer effect
  useEffect(() => {
    debugLog('Setting up resize observer')
    if (!mapRef.current || !mapContainerRef.current) {
      debugLog('Resize observer: Missing refs')
      return
    }

    const debouncedResize = debounce(() => {
      debugLog('Resizing map')
      mapRef.current?.resize()
    }, 300)

    const resizeObserver = new ResizeObserver(debouncedResize)
    resizeObserver.observe(mapContainerRef.current)

    return () => {
      debugLog('Cleaning up resize observer')
      if (mapContainerRef.current) {
        resizeObserver.unobserve(mapContainerRef.current)
      }
      resizeObserver.disconnect()
      debouncedResize.cancel()
    }
  }, [mapRef])

  // Create a memoized debounced handler
  const debouncedLocationChange = useMemo(
    () =>
      debounce((center: mapboxgl.LngLat, rectangle: Rectangle) => {
        onLocationChange({
          center: {
            latitude: center.lat,
            longitude: center.lng,
          },
          bounds: {
            northEast: {
              latitude: rectangle.northEast.latitude,
              longitude: rectangle.northEast.longitude,
            },
            southWest: {
              latitude: rectangle.southWest.latitude,
              longitude: rectangle.southWest.longitude,
            },
          },
        })
      }, 500),
    [onLocationChange],
  )

  // Memoize the location update handler
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const handleMapMove = useCallback(() => {
    if (!mapRef.current) return

    const map = mapRef.current
    const center = map.getCenter()
    const bounds = calculateAspectRatioBounds(map)

    // Add validation checks
    if (
      !bounds ||
      !center ||
      !Number.isFinite(center.lat) ||
      !Number.isFinite(center.lng)
    ) {
      console.warn('Invalid map coordinates detected:', { bounds, center })
      return
    }

    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()

    // Validate bound coordinates
    if (
      !Number.isFinite(ne.lat) ||
      !Number.isFinite(ne.lng) ||
      !Number.isFinite(sw.lat) ||
      !Number.isFinite(sw.lng)
    ) {
      console.warn('Invalid bounds coordinates:', { ne, sw })
      return
    }

    // Add bounds width validation
    const width = Math.abs(ne.lng - sw.lng)
    if (width > 180) {
      console.warn('Viewport too wide, skipping update:', width)
      return
    }

    // Ensure coordinates are within valid ranges
    const normalizedRectangle = {
      northEast: {
        latitude: Math.min(Math.max(ne.lat, -90), 90),
        longitude: Math.min(Math.max(ne.lng, -180), 180),
      },
      southWest: {
        latitude: Math.min(Math.max(sw.lat, -90), 90),
        longitude: Math.min(Math.max(sw.lng, -180), 180),
      },
    }

    centerMarkerRef.current?.setLngLat(center)
    debouncedLocationChange(center, normalizedRectangle)
  }, [debouncedLocationChange])

  // Set up map movement handlers once
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!mapRef.current) return

    const map = mapRef.current
    map.on('move', handleMapMove)

    return () => {
      map.off('move', handleMapMove)
    }
  }, [handleMapMove])

  // Improve location update effect
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!mapRef.current) return

    const map = mapRef.current
    const currentCenter = map.getCenter()
    const targetCenter = [
      userLocation.center.longitude,
      userLocation.center.latitude,
    ]

    // Skip if we're already at the target location
    if (
      currentCenter.lng === targetCenter[0] &&
      currentCenter.lat === targetCenter[1]
    ) {
      return
    }

    map.fitBounds(
      [
        [
          userLocation.bounds.southWest.longitude,
          userLocation.bounds.southWest.latitude,
        ],
        [
          userLocation.bounds.northEast.longitude,
          userLocation.bounds.northEast.latitude,
        ],
      ],
      {
        maxZoom: 16,
      },
    )
  }, [userLocation.center.latitude, userLocation.center.longitude])

  return (
    <>
      <div ref={mapContainerRef} className="h-full w-full" />
      {searchInfo.keyword && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <Button
            size="lg"
            onClick={onSearchArea}
            className="shadow-lg h-[40px]"
            disabled={propIsLoading}
          >
            {propIsLoading ? (
              <LoadingSpinner className="w-4 h-4 mr-2" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            Search in this area
          </Button>
        </div>
      )}
    </>
  )
}
