import './styles.css'
import { useMapInitialization } from '@/features/MapDisplay/hooks/useMapInitialization'
import { useMapSquare } from '@/features/MapDisplay/hooks/useMapSquare'
import { MAP_SETTINGS } from '@/features/MapDisplay/types'
import type { Location } from '@/features/MapDisplay/types'
import { debounce } from '@/lib/debounce'
import type { PlacesSearchResponse } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import mapboxgl from 'mapbox-gl'
import { type FC, useEffect, useMemo, useRef } from 'react'
import { useMarkers } from './hooks/useMarkers'

const DEBUG = process.env.NODE_ENV === 'development'

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
  searchResults: PlacesSearchResponse | null
  dataTableHoveredPlaceId: string | null
  setMapBoxSelectedPlaceId: (placeId: string | null) => void
  setMapBoxHoveredPlaceId: (placeId: string | null) => void
  userLocation: Location
  dataTableRowSelection: RowSelectionState
  radiusInMeters: number
  setRadiusInMeters: (radius: number) => void
  listId?: string
}

export const MapBox: FC<MapBoxProps> = ({
  onLocationChange,
  searchResults,
  dataTableHoveredPlaceId,
  setMapBoxSelectedPlaceId,
  setMapBoxHoveredPlaceId,
  userLocation,
  dataTableRowSelection,
  radiusInMeters,
  listId,
}) => {
  debugLog('MapBox render:', { userLocation, radiusInMeters, listId })

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const currentHoveredPlaceIdRef = useRef<string | null>(null)
  const centerMarkerRef = useRef<mapboxgl.Marker | null>(null)

  const initialCenter = useMemo(() => {
    debugLog('Calculating initial center:', userLocation)
    return [userLocation.longitude, userLocation.latitude] as [number, number]
  }, [userLocation])

  const mapRef = useMapInitialization(
    mapContainerRef,
    initialCenter,
    MAP_SETTINGS,
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
    debugLog('Map initialization effect running', { listId })
    if (!mapRef.current || listId) {
      debugLog('Map initialization skipped:', {
        hasMap: !!mapRef.current,
        listId,
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
  }, [radiusInMeters, mapRef, calculateSquareCoordinates, listId])

  // Map movement effect
  useEffect(() => {
    debugLog('Setting up map movement handlers', { listId })
    if (!mapRef.current || listId) {
      debugLog('Map movement setup skipped')
      return
    }

    mapRef.current.on('move', () => {
      debugLog('Map move event')
      if (mapRef.current) {
        const center = mapRef.current.getCenter()
        centerMarkerRef.current?.setLngLat(center)
        updateSquareData(center, radiusInMeters)
        onLocationChange({
          latitude: center.lat,
          longitude: center.lng,
          radiusInMeters,
        })
      }
    })
  }, [radiusInMeters, mapRef, updateSquareData, onLocationChange, listId])

  // Square update effect
  useEffect(() => {
    debugLog('Square update effect', { listId })
    if (!mapRef.current || listId) {
      debugLog('Square update skipped')
      return
    }
    updateSquareData(mapRef.current.getCenter(), radiusInMeters)
  }, [radiusInMeters, mapRef, updateSquareData, listId])

  // Markers setup
  const markersMapRef = useMarkers(
    mapRef,
    searchResults,
    dataTableRowSelection,
    setMapBoxSelectedPlaceId,
    setMapBoxHoveredPlaceId,
  )

  // Hover state effect
  useEffect(() => {
    debugLog('Hover state effect', {
      dataTableHoveredPlaceId,
      currentHoveredPlaceIdRef,
    })
    if (
      !mapRef.current ||
      !currentHoveredPlaceIdRef.current ||
      !dataTableHoveredPlaceId
    ) {
      debugLog('Hover state skipped: no map')
      return
    }

    if (currentHoveredPlaceIdRef.current) {
      const previousMarkerData = markersMapRef.current.get(
        currentHoveredPlaceIdRef.current,
      )
      if (previousMarkerData?.marker.getPopup()?.isOpen()) {
        previousMarkerData.marker.togglePopup()
      }
    }

    if (!dataTableHoveredPlaceId) {
      currentHoveredPlaceIdRef.current = null
      return
    }

    const markerData = markersMapRef.current.get(dataTableHoveredPlaceId)
    if (!markerData?.marker.getLngLat()) {
      debugLog('No marker data found for hover')
      return
    }
    if (markerData.marker.getPopup()?.isOpen()) return

    markerData.marker.togglePopup()
    currentHoveredPlaceIdRef.current = dataTableHoveredPlaceId
  }, [dataTableHoveredPlaceId, mapRef, markersMapRef])

  return (
    <>
      <div ref={mapContainerRef} className="h-full w-full" />
    </>
  )
}
