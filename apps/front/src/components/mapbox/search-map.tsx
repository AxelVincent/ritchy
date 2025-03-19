// import './styles.css'
import { useMapInitialization } from '@/components/map-display/hooks/useMapInitialization'
import { useMapSquare } from '@/components/map-display/hooks/useMapSquare'
import { MAP_SETTINGS } from '@/components/map-display/types'
import type { MapboxLocationParameters } from '@/components/map-display/types'
import { debounce } from '@/lib/debounce'
import mapboxgl, { type LngLat } from 'mapbox-gl'
import { type FC, useEffect, useMemo, useRef } from 'react'

const DEBUG = false

const debugLog = (...args: unknown[]) => {
  if (DEBUG) {
    console.log('[MapBox]', ...args)
  }
}

// Create a dedicated type for the location change event
type LocationChangeEvent = {
  latitude: number
  longitude: number
  radiusInMeters: number
}

// Improve props interface with more specific types
interface MapBoxProps {
  onLocationChange: (location: LocationChangeEvent) => void
  userLocation: MapboxLocationParameters
  radiusInMeters: number
}

export const SearchMap: FC<MapBoxProps> = ({
  onLocationChange,
  userLocation,
  radiusInMeters,
}) => {
  debugLog('MapBox render:', { userLocation, radiusInMeters })

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const centerMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const isSelectionMovement = useRef(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const initialCenter = useMemo(() => {
    debugLog('Calculating initial center:', userLocation)
    return [userLocation.longitude, userLocation.latitude] as [number, number]
  }, [userLocation.latitude, userLocation.longitude])

  const mapRef = useMapInitialization(
    mapContainerRef,
    initialCenter,
    MAP_SETTINGS,
    false,
  )

  const { calculateSquareCoordinates, updateSquareData } = useMapSquare(mapRef)

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
    }, 100)

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

  // Map initialization effect
  useEffect(() => {
    debugLog('Map initialization effect running')
    if (!mapRef.current) {
      debugLog('Map initialization skipped:', {
        hasMap: !!mapRef.current,
      })
      return
    }

    mapRef.current.on('load', () => {
      debugLog('Map load event triggered')
      if (!mapRef.current) {
        debugLog('Map ref lost during load event')
        return
      }

      debugLog('Creating center marker')
      centerMarkerRef.current = new mapboxgl.Marker()
        .setLngLat(mapRef.current.getCenter())
        .addTo(mapRef.current)

      debugLog('Adding square source')
      try {
        mapRef.current?.addSource('square', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                calculateSquareCoordinates(
                  mapRef.current.getCenter(),
                  radiusInMeters,
                ),
              ],
            },
          },
        })

        debugLog('Adding square fill layer')
        mapRef.current?.addLayer({
          id: 'center-square',
          type: 'fill',
          source: 'square',
          paint: {
            'fill-color': 'blue',
            'fill-opacity': 0.1,
          },
        })

        debugLog('Adding square border layer')
        mapRef.current?.addLayer({
          id: 'center-square-border',
          type: 'line',
          source: 'square',
          paint: {
            'line-color': 'blue',
            'line-width': 1,
          },
        })
      } catch (error) {
        debugLog('Error setting up map layers:', error)
      }
    })
  }, [radiusInMeters, mapRef, calculateSquareCoordinates])

  // Create a memoized debounced handler
  const debouncedLocationChange = useMemo(
    () =>
      debounce((center: LngLat) => {
        onLocationChange({
          latitude: center.lat,
          longitude: center.lng,
          radiusInMeters,
        })
      }, 1000),
    [onLocationChange, radiusInMeters],
  )

  // Map movement effect
  useEffect(() => {
    debugLog('Setting up map movement handlers')
    if (!mapRef.current) {
      debugLog('Map movement setup skipped')
      return
    }

    mapRef.current.on('move', () => {
      if (isSelectionMovement.current) return

      if (mapRef.current) {
        const center = mapRef.current.getCenter()
        centerMarkerRef.current?.setLngLat(center)
        updateSquareData(center, radiusInMeters)
        debouncedLocationChange(center)
      }
    })

    return () => {
      debouncedLocationChange.cancel()
    }
  }, [radiusInMeters, mapRef, updateSquareData, debouncedLocationChange])

  // Square update effect
  useEffect(() => {
    debugLog('Square update effect')
    if (!mapRef.current) {
      debugLog('Square update skipped')
      return
    }
    updateSquareData(mapRef.current.getCenter(), radiusInMeters)
  }, [radiusInMeters, mapRef, updateSquareData])

  return (
    <>
      <div ref={mapContainerRef} className="h-full w-full" />
    </>
  )
}
