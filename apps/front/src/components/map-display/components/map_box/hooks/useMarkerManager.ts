import { useMapStore } from '@/components/map-display/store/useMapStore'
import { getStatusColor } from '@/components/status/status-colors'
import type { Place } from '@ritchy/types'
import mapboxgl from 'mapbox-gl'
import { useEffect, useRef } from 'react'
import { MARKER_COLORS } from '../constants/markers'
import {
  createActiveMarker,
  createFilteredMarkerSvg
} from '../place_marker/markerSvg'

type MarkerState = {
  isDisplayed: boolean
  isSelectedPlace: boolean
  color: string
  emoji?: string
  hasBadge: boolean
}

type MarkerRef = {
  marker: mapboxgl.Marker
  currentState: MarkerState
}

type UseMarkerManagerProps = {
  map: mapboxgl.Map | null
  places: Place[] | null
  displayedPlaceIds: Set<string>
}

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
        'hex'
      )
    )
  }
  return colorCache.get(status) || MARKER_COLORS.DEFAULT
}

const createMarker = (
  place: Place,
  onClick: (placeId: string) => void
): mapboxgl.Marker => {
  const markerElement = document.createElement('div')
  markerElement.classList.add('marker')
  markerElement.style.cursor = 'pointer'
  markerElement.style.transform = 'translate(-50%, -100%)'

  const marker = new mapboxgl.Marker({
    element: markerElement,
    scale: 1,
    offset: [0, -14]
  }).setLngLat([place.location.longitude, place.location.latitude])

  markerElement.addEventListener('click', () => {
    requestAnimationFrame(() => onClick(place.id))
  })

  return marker
}

const computeMarkerState = (
  place: Place,
  isDisplayed: boolean,
  selectedPlaceId: string | null
): MarkerState => ({
  isDisplayed,
  isSelectedPlace: place.id === selectedPlaceId,
  color: place.status ? getColorWithCache(place.status) : MARKER_COLORS.DEFAULT,
  emoji: place.lists?.[0]?.emoji,
  hasBadge: Boolean(place.lists && place.lists.length > 1)
})

const updateMarkerVisuals = (
  marker: mapboxgl.Marker,
  newState: MarkerState,
  currentState: MarkerState,
  place: Place
): void => {
  const element = marker.getElement()
  const hasStateChanged =
    JSON.stringify(newState) !== JSON.stringify(currentState)

  if (!hasStateChanged) return

  const newElement = newState.isDisplayed
    ? createActiveMarker(
        newState.color,
        { lists: [{ emoji: place?.lists?.[0]?.emoji ?? '' }] } as Place,
        newState.isSelectedPlace
      )
    : createFilteredMarkerSvg()

  while (element.firstChild) {
    element.removeChild(element.firstChild)
  }
  element.appendChild(newElement)

  element.classList.toggle('filtered-marker', !newState.isDisplayed)
  element.classList.toggle('active-marker', newState.isDisplayed)
  element.classList.toggle('selected-place-marker', newState.isSelectedPlace)
}

export const useMarkerManager = ({
  map,
  places,
  displayedPlaceIds
}: UseMarkerManagerProps) => {
  const { setCenterPlaceSpreadsheetId, setSelectedPlaceId, selectedPlaceId } =
    useMapStore()
  const markersRef = useRef<Map<string, MarkerRef>>(new Map())

  useEffect(() => {
    if (!map) return

    return () => {
      for (const [, { marker }] of markersRef.current.entries()) {
        marker.remove()
      }
      markersRef.current.clear()
    }
  }, [map])

  // Marker management effect
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!map || !places) return

    const handleMarkerClick = (placeId: string) => {
      setCenterPlaceSpreadsheetId(placeId)
      setSelectedPlaceId(placeId)
    }

    const updateMarkers = async () => {
      // Remove stale markers
      const currentPlaceIds = new Set(places.map((place) => place.id))
      for (const [id, { marker }] of markersRef.current.entries()) {
        if (!currentPlaceIds.has(id)) {
          marker.remove()
          markersRef.current.delete(id)
        }
      }

      // Update or create markers
      for (const place of places) {
        const markerRef = markersRef.current.get(place.id)
        const newState = computeMarkerState(
          place,
          displayedPlaceIds.has(place.id),
          selectedPlaceId
        )

        if (!markerRef) {
          // Create new marker
          const marker = createMarker(place, handleMarkerClick)
          marker.addTo(map)
          markersRef.current.set(place.id, {
            marker,
            currentState: newState
          })
          updateMarkerVisuals(marker, newState, {} as MarkerState, place)
        } else {
          // Update existing marker
          updateMarkerVisuals(
            markerRef.marker,
            newState,
            markerRef.currentState,
            place
          )
          markerRef.currentState = newState
        }
      }
    }

    updateMarkers().catch(console.error)
  }, [map, places, displayedPlaceIds, selectedPlaceId])

  return { markersRef }
}
