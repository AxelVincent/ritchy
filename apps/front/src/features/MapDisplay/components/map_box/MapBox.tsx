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
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const currentHoveredPlaceIdRef = useRef<string | null>(null)
  const centerMarkerRef = useRef<mapboxgl.Marker | null>(null)

  // Default center coordinates
  const initialCenter = useMemo(
    () => [userLocation.longitude, userLocation.latitude] as [number, number],
    [userLocation],
  )

  // Initialize map and circle functionality
  const mapRef = useMapInitialization(
    mapContainerRef,
    initialCenter,
    MAP_SETTINGS,
  )
  const { calculateSquareCoordinates, updateSquareData } = useMapSquare(mapRef)

  useEffect(() => {
    if (!mapRef.current || !mapContainerRef.current) return

    // Debounce the resize handler with 100ms delay
    const debouncedResize = debounce(() => {
      mapRef.current?.resize()
    }, 100)

    const resizeObserver = new ResizeObserver(debouncedResize)
    resizeObserver.observe(mapContainerRef.current)

    return () => {
      if (mapContainerRef.current) {
        resizeObserver.unobserve(mapContainerRef.current)
      }
      resizeObserver.disconnect()
      debouncedResize.cancel() // Clean up the debounced function
    }
  }, [mapRef])

  // Effect: Initialize map circle and center marker
  useEffect(() => {
    if (!mapRef.current || listId) return

    mapRef.current.on('load', () => {
      if (!mapRef.current) return
      centerMarkerRef.current = new mapboxgl.Marker()
        .setLngLat(mapRef.current.getCenter())
        .addTo(mapRef.current)

      // Add square source
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

      // Add square fill layer
      mapRef.current?.addLayer({
        id: 'center-square',
        type: 'fill',
        source: 'square',
        paint: {
          'fill-color': 'blue', // Different color to distinguish from circle
          'fill-opacity': 0.1,
        },
      })

      // Add square border layer
      mapRef.current?.addLayer({
        id: 'center-square-border',
        type: 'line',
        source: 'square',
        paint: {
          'line-color': 'blue',
          'line-width': 1,
        },
      })
    })
  }, [radiusInMeters, mapRef, calculateSquareCoordinates, listId])

  // Effect: Add center marker and handle map movement
  useEffect(() => {
    if (!mapRef.current || listId) return

    // Update marker position and notify parent of location changes
    mapRef.current.on('move', () => {
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

  useEffect(() => {
    if (!mapRef.current || listId) return
    updateSquareData(mapRef.current.getCenter(), radiusInMeters)
  }, [radiusInMeters, mapRef, updateSquareData, listId])

  const markersMapRef = useMarkers(
    mapRef,
    searchResults,
    dataTableRowSelection,
    setMapBoxSelectedPlaceId,
    setMapBoxHoveredPlaceId,
  )

  // Effect: Handle hover state and popup visibility
  useEffect(() => {
    if (!mapRef.current) return

    // Close previous popup if exists
    if (currentHoveredPlaceIdRef.current) {
      const previousMarkerData = markersMapRef.current.get(
        currentHoveredPlaceIdRef.current,
      )
      if (previousMarkerData?.marker.getPopup()?.isOpen()) {
        previousMarkerData.marker.togglePopup()
      }
    }

    // Handle new hover state
    if (!dataTableHoveredPlaceId) {
      currentHoveredPlaceIdRef.current = null
      return
    }

    // Show popup for newly hovered place
    const markerData = markersMapRef.current.get(dataTableHoveredPlaceId)
    if (!markerData?.marker.getLngLat()) return
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
