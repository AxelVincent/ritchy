import type { Place } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import mapboxgl from 'mapbox-gl'
import { useEffect, useRef, useState } from 'react'
import { MARKER_COLORS, MARKER_SETTINGS } from '../constants/markers'
import {
  createActiveMarkerSvg,
  createFilteredMarkerSvg,
} from '../place_marker/markerSvg'

type MarkerRef = {
  marker: mapboxgl.Marker
  popupContainer: HTMLElement
}

type UseMarkerManagerProps = {
  map: mapboxgl.Map | null
  places: Place[] | null
  filteredPlaceIds: Set<string>
  dataTableRowSelection: RowSelectionState
  onMarkerClick?: (placeId: string) => void
}

export const useMarkerManager = ({
  map,
  places,
  filteredPlaceIds,
  dataTableRowSelection,
  onMarkerClick,
}: UseMarkerManagerProps) => {
  const [openPopups, setOpenPopups] = useState<Set<string>>(new Set())
  const markersRef = useRef<Map<string, MarkerRef>>(new Map())
  const prevPlacesRef = useRef<Place[] | null>(null)

  useEffect(() => {
    if (prevPlacesRef.current !== places) {
      prevPlacesRef.current = places
    }

    if (!map || !places) {
      return
    }

    // Track existing marker IDs to remove stale ones
    const currentPlaceIds = new Set(places.map((place) => place.id))
    const removedMarkers: string[] = []
    const updatedMarkers: string[] = []
    const newMarkers: string[] = []

    // Remove stale markers
    for (const [id, { marker }] of markersRef.current.entries()) {
      if (!currentPlaceIds.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
        removedMarkers.push(id)
      }
    }

    // Update or create markers
    for (const place of places) {
      const isFiltered = !filteredPlaceIds.has(place.id)
      const isSelected = dataTableRowSelection[place.id] ?? false
      const existing = markersRef.current.get(place.id)

      let color = MARKER_COLORS.DEFAULT
      if (isFiltered) {
        color = MARKER_COLORS.FILTERED
      } else if (isSelected) {
        color = MARKER_COLORS.SELECTED
      }

      if (existing) {
        // Update existing marker
        updatedMarkers.push(place.id)
        const element = existing.marker.getElement()
        element.classList.toggle('filtered-marker', isFiltered)
        element.classList.toggle('active-marker', !isFiltered)

        const svg = isFiltered
          ? createFilteredMarkerSvg()
          : createActiveMarkerSvg(color, place)
        element.innerHTML = '' // Clear existing content
        element.appendChild(svg)

        // Update marker position
        existing.marker.setLngLat([
          place.location.longitude,
          place.location.latitude,
        ])

        // Update popup offset
        const popup = existing.marker.getPopup()
        if (popup) {
          popup.options.offset = isFiltered
            ? MARKER_SETTINGS.popupOffsetFiltered
            : MARKER_SETTINGS.popupOffsetActive
        }
      } else {
        // Create new marker
        newMarkers.push(place.id)
        const popupContainer = document.createElement('div')
        const popup = new mapboxgl.Popup({
          closeButton: true,
          maxWidth: MARKER_SETTINGS.popupMaxWidth,
          offset: isFiltered
            ? MARKER_SETTINGS.popupOffsetFiltered
            : MARKER_SETTINGS.popupOffsetActive,
        })
          .setDOMContent(popupContainer)
          .on('open', () =>
            setOpenPopups((prev) => new Set(prev).add(place.id)),
          )
          .on('close', () =>
            setOpenPopups((prev) => {
              const next = new Set(prev)
              next.delete(place.id)
              return next
            }),
          )

        const marker = new mapboxgl.Marker({ scale: 1 })
          .setLngLat([place.location.longitude, place.location.latitude])
          .setPopup(popup)
          .addTo(map)

        const element = marker.getElement()
        element.classList.add('marker')
        element.style.cursor = 'pointer'
        element.style.transform = 'translate(-50%, -100%)'
        element.classList.add(isFiltered ? 'filtered-marker' : 'active-marker')

        const svg = isFiltered
          ? createFilteredMarkerSvg()
          : createActiveMarkerSvg(color, place)
        element.innerHTML = '' // Clear any existing content
        element.appendChild(svg)

        if (onMarkerClick) {
          element.addEventListener('click', () => onMarkerClick(place.id))
        }

        markersRef.current.set(place.id, { marker, popupContainer })
      }
    }
  }, [map, places, filteredPlaceIds, dataTableRowSelection, onMarkerClick])

  return {
    openPopups,
    markersRef,
    popupContainers: new Map(
      Array.from(markersRef.current.entries()).map(
        ([id, { popupContainer }]) => [id, popupContainer],
      ),
    ),
  }
}
