import type { Place, PlacesSearchResponse } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl'
import { type MutableRefObject, useEffect, useRef } from 'react'
import { MARKER_COLORS } from '../constants/markers'
import { MarkerWithPopup } from '../place_marker/Marker'

interface MarkerData {
  marker: MapboxMarker
  place: Place
}

export const useMarkers = (
  mapRef: MutableRefObject<MapboxMap | null>,
  searchResults: PlacesSearchResponse | null,
  dataTableRowSelection: RowSelectionState,
  setMapBoxSelectedPlaceId: (placeId: string | null) => void,
  filteredPlaceIds: Set<string>,
): MutableRefObject<Map<string, MarkerData>> => {
  const markersMapRef = useRef(new Map<string, MarkerData>()) // Stores active markers

  // Effect for creating/removing markers
  useEffect(() => {
    // Clean up existing markers
    for (const { marker } of markersMapRef.current.values()) {
      marker.remove()
    }
    markersMapRef.current.clear()

    if (!mapRef.current || !searchResults) return

    // Create new markers for search results
    for (const place of searchResults) {
      if (place.location) {
        // Always start with default color - colors will be updated by the other effect
        const marker = MarkerWithPopup(
          place,
          MARKER_COLORS.DEFAULT,
          setMapBoxSelectedPlaceId,
        )
        marker.addTo(mapRef.current)
        markersMapRef.current.set(place.id, { marker, place })
      }
    }

    // Cleanup function
    return () => {
      for (const { marker } of markersMapRef.current.values()) {
        marker.remove()
      }
      markersMapRef.current.clear()
    }
  }, [searchResults, mapRef, setMapBoxSelectedPlaceId])

  // Effect for updating marker colors
  useEffect(() => {
    if (!mapRef.current) return

    const entries = Array.from(markersMapRef.current.entries())
    for (const [placeId, markerData] of entries) {
      const isSelected = dataTableRowSelection[placeId] ?? false
      const isFiltered = !filteredPlaceIds.has(placeId)

      let color = MARKER_COLORS.DEFAULT
      if (isFiltered) {
        color = MARKER_COLORS.FILTERED
      } else if (isSelected) {
        color = MARKER_COLORS.SELECTED
      }

      const wasPopupOpen = markerData.marker.getPopup()?.isOpen()
      const currentColor = markerData.marker._color

      // Only update if the color actually changed
      if (currentColor !== color) {
        markerData.marker.remove()
        const newMarker = MarkerWithPopup(
          markerData.place,
          color,
          setMapBoxSelectedPlaceId,
        )
        newMarker.addTo(mapRef.current)
        if (wasPopupOpen) {
          newMarker.togglePopup()
        }
        markersMapRef.current.set(placeId, { ...markerData, marker: newMarker })
      }
    }
  }, [
    dataTableRowSelection,
    filteredPlaceIds,
    setMapBoxSelectedPlaceId,
    mapRef,
  ])

  return markersMapRef
}
