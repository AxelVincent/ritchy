import './styles.css'
import { useMapInitialization } from '@/features/MapDisplay/hooks/useMapInitialization'
import { useMapSquare } from '@/features/MapDisplay/hooks/useMapSquare'
import { MAP_SETTINGS } from '@/features/MapDisplay/types'
import type { Location } from '@/features/MapDisplay/types'
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
  viewMode: 'map' | 'data' | 'equal'
  setMapBoxHoveredPlaceId: (placeId: string | null) => void
  userLocation: Location
  dataTableRowSelection: RowSelectionState
  radiusInMeters: number
  setRadiusInMeters: (radius: number) => void
}

export const MapBox: FC<MapBoxProps> = ({
  onLocationChange,
  searchResults,
  dataTableHoveredPlaceId,
  setMapBoxSelectedPlaceId,
  viewMode,
  setMapBoxHoveredPlaceId,
  userLocation,
  dataTableRowSelection,
  radiusInMeters,
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

  // Step 2: Update map size on view mode change
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.resize()
  }, [viewMode, mapRef])

  // Effect: Initialize map circle and center marker
  useEffect(() => {
    if (!mapRef.current) return

    mapRef.current.on('load', () => {
      console.log('load')
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
  }, [radiusInMeters, mapRef, calculateSquareCoordinates])

  // Effect: Add center marker and handle map movement
  useEffect(() => {
    if (!mapRef.current) return

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
  }, [radiusInMeters, mapRef, updateSquareData, onLocationChange])

  useEffect(() => {
    if (!mapRef.current) return
    updateSquareData(mapRef.current.getCenter(), radiusInMeters)
  }, [radiusInMeters, mapRef, updateSquareData])

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
      <div ref={mapContainerRef} className="h-screen w-full" />
    </>
  )
}
