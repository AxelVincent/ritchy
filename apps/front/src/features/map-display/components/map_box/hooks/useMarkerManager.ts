import type { Place } from '@ritchy/types'
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
  places: Place[]
  filteredPlaceIds: Set<string>
  onMarkerClick?: (placeId: string) => void
}

export const useMarkerManager = ({
  map,
  places,
  filteredPlaceIds,
  onMarkerClick,
}: UseMarkerManagerProps) => {
  const [openPopups, setOpenPopups] = useState<Set<string>>(new Set())
  const markersRef = useRef<Map<string, MarkerRef>>(new Map())
  const color = MARKER_COLORS.DEFAULT

  // Create or update markers when places or filtered state changes
  useEffect(() => {
    if (!map) return

    for (const place of places) {
      const isFiltered = !filteredPlaceIds.has(place.id)
      const existing = markersRef.current.get(place.id)

      if (existing) {
        // Update existing marker
        const element = existing.marker.getElement()
        element.classList.toggle('filtered-marker', isFiltered)
        element.classList.toggle('active-marker', !isFiltered)

        // Update SVG
        const svg = isFiltered
          ? createFilteredMarkerSvg()
          : createActiveMarkerSvg(color, place)
        element.textContent = ''
        element.appendChild(svg)

        // Update popup offset
        const popup = existing.marker.getPopup()
        if (popup) {
          popup.options.offset = isFiltered
            ? MARKER_SETTINGS.popupOffsetFiltered
            : MARKER_SETTINGS.popupOffsetActive
        }
      } else {
        // Create new marker
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
        element.textContent = ''
        element.appendChild(svg)

        if (onMarkerClick) {
          element.addEventListener('click', () => onMarkerClick(place.id))
        }

        markersRef.current.set(place.id, { marker, popupContainer })
      }
    }
  }, [map, places, filteredPlaceIds, color, onMarkerClick])

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
