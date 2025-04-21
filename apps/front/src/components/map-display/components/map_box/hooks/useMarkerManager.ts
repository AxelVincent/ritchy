import { useMapStore } from '@/components/map-display/store/useMapStore'
import { getStatusColor } from '@/components/status/status-colors'
import type { Place } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import mapboxgl from 'mapbox-gl'
import { useEffect, useRef } from 'react'
import { MARKER_COLORS } from '../constants/markers'
import {
  createActiveMarker,
  createFilteredMarkerSvg,
  updateEmojiMarker,
} from '../place_marker/markerSvg'

type MarkerRef = {
  marker: mapboxgl.Marker
}

type UseMarkerManagerProps = {
  map: mapboxgl.Map | null
  places: Place[] | null
  displayedPlaceIds: Set<string>
  dataTableRowSelection: RowSelectionState
}

const addMarkerWithRetry = async (
  marker: mapboxgl.Marker,
  map: mapboxgl.Map,
  maxRetries = 3,
  delay = 100,
): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      marker.addTo(map)
      return true
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error(
          'Failed to add marker after',
          maxRetries,
          'attempts:',
          error,
        )
        return false
      }
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  return false
}

// Add color caching
const colorCache = new Map<string, string>()
const getColorWithCache = (status: string): string => {
  if (!colorCache.has(status)) {
    colorCache.set(
      status,
      getStatusColor(
        status as
          | 'NEW'
          | 'NO_ANSWER'
          | 'CONTACTED'
          | 'FOLLOW_UP'
          | 'MEETING'
          | 'INTERESTED'
          | 'WON'
          | 'LOST',
        'hex',
      ),
    )
  }
  return colorCache.get(status) || MARKER_COLORS.DEFAULT
}

export const useMarkerManager = ({
  map,
  places,
  displayedPlaceIds,
  dataTableRowSelection,
}: UseMarkerManagerProps) => {
  const { setCenterPlaceSpreadsheetId, setSelectedPlaceId, selectedPlaceId } =
    useMapStore()
  const markersRef = useRef<Map<string, MarkerRef>>(new Map())
  const markerStateCache = useRef(
    new Map<
      string,
      {
        color: string
        isDisplayed: boolean
        isSelected: boolean
        isSelectedPlace: boolean
        emoji?: string
        hasBadge?: boolean
      }
    >(),
  ).current

  // Cleanup effect
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!map) return

    return () => {
      for (const [, { marker }] of markersRef.current.entries()) {
        marker.remove()
      }
      markersRef.current.clear()
      markerStateCache.clear()
    }
  }, [map])

  // Single effect to handle all marker lifecycle and updates
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!map || !places) return
    const setupAndUpdateMarkers = async () => {
      // Wait for map to load if needed
      if (!map.loaded()) {
        await new Promise<void>((resolve) => {
          const onLoad = () => {
            map.off('load', onLoad)
            resolve()
          }
          map.on('load', onLoad)
        })
      }

      // Remove stale markers
      const currentPlaceIds = new Set(places.map((place) => place.id))
      for (const [id, { marker }] of markersRef.current.entries()) {
        if (!currentPlaceIds.has(id)) {
          marker.remove()
          markersRef.current.delete(id)
          markerStateCache.delete(id)
        }
      }

      // Process all places
      for (const place of places) {
        // Create marker if it doesn't exist
        if (!markersRef.current.has(place.id)) {
          const markerElement = document.createElement('div')
          markerElement.classList.add('marker')
          markerElement.style.cursor = 'pointer'
          markerElement.style.transform = 'translate(-50%, -100%)'

          const marker = new mapboxgl.Marker({
            element: markerElement,
            scale: 1,
            offset: [0, -14],
          }).setLngLat([place.location.longitude, place.location.latitude])

          await addMarkerWithRetry(marker, map)

          markerElement.addEventListener('click', () => {
            requestAnimationFrame(() => {
              setCenterPlaceSpreadsheetId(place.id)
              setSelectedPlaceId(place.id)
            })
          })

          markersRef.current.set(place.id, { marker })
        }

        // Update marker appearance
        const markerRef = markersRef.current.get(place.id)
        if (!markerRef) continue

        const isDisplayed = displayedPlaceIds.has(place.id)
        const isSelected = dataTableRowSelection[place.id] ?? false
        const isSelectedPlace = place.id === selectedPlaceId

        const color = isSelected
          ? MARKER_COLORS.SELECTED
          : place.status
            ? getColorWithCache(place.status.status)
            : MARKER_COLORS.DEFAULT

        const emoji = place.lists?.[0]?.emoji
        const hasBadge = place.lists && place.lists.length > 1

        // Check if update is needed
        const cachedState = markerStateCache.get(place.id)
        const hasChanged =
          !cachedState ||
          cachedState.color !== color ||
          cachedState.isDisplayed !== isDisplayed ||
          cachedState.isSelected !== isSelected ||
          cachedState.isSelectedPlace !== isSelectedPlace ||
          cachedState.emoji !== emoji ||
          cachedState.hasBadge !== hasBadge

        if (hasChanged) {
          const element = markerRef.marker.getElement()

          if (
            isDisplayed &&
            emoji &&
            element.firstChild &&
            (element.firstChild as HTMLElement).classList?.contains(
              'emoji-marker',
            )
          ) {
            // Update existing emoji marker
            updateEmojiMarker(
              element.firstChild as HTMLElement,
              color,
              isSelectedPlace,
              !!hasBadge,
            )
          } else {
            // Create new marker content
            const newElement = isDisplayed
              ? createActiveMarker(color, place, isSelectedPlace)
              : createFilteredMarkerSvg()

            while (element.firstChild) {
              element.removeChild(element.firstChild)
            }
            element.appendChild(newElement)
          }

          // Update marker classes
          element.classList.toggle('filtered-marker', !isDisplayed)
          element.classList.toggle('active-marker', isDisplayed)
          element.classList.toggle('selected-place-marker', isSelectedPlace)

          // Update cache
          markerStateCache.set(place.id, {
            color,
            isDisplayed,
            isSelected,
            isSelectedPlace,
            emoji,
            hasBadge,
          })
        }
      }
    }

    setupAndUpdateMarkers().catch((error) => {
      console.error('Error in setupAndUpdateMarkers:', error)
    })
  }, [map, places, displayedPlaceIds, dataTableRowSelection, selectedPlaceId])

  return { markersRef }
}
