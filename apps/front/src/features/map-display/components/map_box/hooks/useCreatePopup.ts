import type { Place } from '@ritchy/types'
import mapboxgl from 'mapbox-gl'
import { useCallback } from 'react'
import { MARKER_SETTINGS } from '../constants/markers'
import {
  createActiveMarkerSvg,
  createFilteredMarkerSvg,
} from '../place_marker/markerSvg'

type MarkerRef = {
  marker: mapboxgl.Marker
  popupContainer: HTMLElement
}

type UseCreatePopupProps = {
  setOpenPopups: React.Dispatch<React.SetStateAction<Set<string>>>
  filteredPlaceIds: Set<string>
  color?: string
}

export const useCreatePopup = ({
  setOpenPopups,
  filteredPlaceIds,
  color = '#FF0000', // Default color if none provided
}: UseCreatePopupProps) => {
  return useCallback(
    (place: Place, map: mapboxgl.Map): MarkerRef => {
      const popupContainer = document.createElement('div')
      // Determine if place is filtered
      const isFiltered = !filteredPlaceIds.has(place.id)

      // Create popup with appropriate offset
      const popup = new mapboxgl.Popup({
        closeButton: true,
        maxWidth: MARKER_SETTINGS.popupMaxWidth,
        offset: isFiltered
          ? MARKER_SETTINGS.popupOffsetFiltered
          : MARKER_SETTINGS.popupOffsetActive,
      })
        .setDOMContent(popupContainer)
        .on('open', () => setOpenPopups((prev) => new Set(prev).add(place.id)))
        .on('close', () =>
          setOpenPopups((prev) => {
            const next = new Set(prev)
            next.delete(place.id)
            return next
          }),
        )

      // Create marker
      const marker = new mapboxgl.Marker({ scale: 1 })
        .setLngLat([place.location.longitude, place.location.latitude])
        .setPopup(popup)
        .addTo(map)

      // Style marker element
      const element = marker.getElement()
      element.classList.add('marker')
      element.style.cursor = 'pointer'
      element.style.transform = 'translate(-50%, -100%)'
      element.classList.add(isFiltered ? 'filtered-marker' : 'active-marker')

      // Create and add appropriate SVG
      const svg = isFiltered
        ? createFilteredMarkerSvg()
        : createActiveMarkerSvg(color, place)
      element.textContent = ''
      element.appendChild(svg)

      return {
        marker,
        popupContainer,
      }
    },
    [setOpenPopups, filteredPlaceIds, color],
  )
}
