import { useMapInitialization } from '@/components/map-display/hooks/useMapInitialization'
import { MAP_SETTINGS } from '@/components/map-display/types'

import { debounce } from '@/lib/debounce'
import type { Rectangle } from '@ritchy/types'
import { type FC, useEffect, useMemo, useRef } from 'react'

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
}

// Optimized animation options for smoother transitions
const ANIMATION_OPTIONS = {
  essential: true, // Won't be affected by reduced motion preferences
  maxDuration: 800, // Cap animation time
  speed: 1.2,
  curve: 1.42,
}

export const SearchMap: FC<MapBoxProps> = ({
  onLocationChange,
  userLocation,
}) => {
  debugLog('MapBox render:', { userLocation })

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const centerMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const isSelectionMovement = useRef(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const initialCenter = useMemo(() => {
    debugLog('Calculating initial center:', userLocation)
    return [userLocation.center.longitude, userLocation.center.latitude] as [
      number,
      number,
    ]
  }, [userLocation.center.latitude, userLocation.center.longitude])

  console.log('initialCenter', initialCenter)
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

  // Update the map movement effect
  useEffect(() => {
    debugLog('Setting up map movement handlers')
    if (!mapRef.current) {
      debugLog('Map movement setup skipped')
      return
    }

    mapRef.current.on('move', () => {
      if (isSelectionMovement.current) return

      if (mapRef.current) {
        const bounds = mapRef.current.getBounds()
        const center = mapRef.current.getCenter()

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

        const rectangle = {
          northEast: {
            latitude: ne.lat,
            longitude: ne.lng,
          },
          southWest: {
            latitude: sw.lat,
            longitude: sw.lng,
          },
        }

        // Only update if we have valid coordinates
        centerMarkerRef.current?.setLngLat(center)
        debouncedLocationChange(center, rectangle)
      }
    })

    // Clean up the debounced function when the component unmounts
    return () => {
      debouncedLocationChange.cancel()
    }
  }, [mapRef, debouncedLocationChange])

  // Update when user location changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!mapRef.current) return

    // Get current center
    const currentCenter = mapRef.current.getCenter()
    const targetCenter = [
      userLocation.center.longitude,
      userLocation.center.latitude,
    ]

    // Calculate distance to determine if we need to fly or jump
    const distanceInDegrees = Math.sqrt(
      (currentCenter.lng - targetCenter[0]) ** 2 +
        (currentCenter.lat - targetCenter[1]) ** 2,
    )

    isSelectionMovement.current = true

    if (distanceInDegrees > 0.2) {
      // For larger distances, just jump there
      mapRef.current.jumpTo({
        center: targetCenter as [number, number],
      })
    } else {
      // For smaller distances, fly smoothly
      mapRef.current.flyTo({
        center: targetCenter as [number, number],
        ...ANIMATION_OPTIONS,
      })
    }

    // Reset selection movement flag after animation completes
    const onMoveEnd = () => {
      isSelectionMovement.current = false
      mapRef.current?.off('moveend', onMoveEnd)
    }
    mapRef.current.on('moveend', onMoveEnd)
  }, [userLocation.center.latitude, userLocation.center.longitude])

  return (
    <>
      <div ref={mapContainerRef} className="h-full w-full" />
    </>
  )
}
