import { useMapStore } from '@/components/map-display/store/useMapStore'
import { getStatusColor } from '@/components/status/status-colors'
import type { Place } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import { throttle } from 'lodash'
import mapboxgl from 'mapbox-gl'
import { useEffect, useMemo, useRef } from 'react'
import { MARKER_COLORS } from '../constants/markers'
import {
  createActiveMarkerSvg,
  createFilteredMarkerSvg,
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

export const useMarkerManager = ({
  map,
  places: propPlaces,
  displayedPlaceIds,
  dataTableRowSelection,
}: UseMarkerManagerProps) => {
  const {
    setCenterPlaceSpreadsheetId,
    places: storePlaces,
    updatedPlaceStatuses,
    setSelectedPlaceId,
    selectedPlaceId,
  } = useMapStore()
  const markersRef = useRef<Map<string, MarkerRef>>(new Map())
  const mapLoadedRef = useRef(false)

  const places = storePlaces.length > 0 ? storePlaces : propPlaces

  // Effect for initial marker creation and cleanup
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!map || !places) return

    const setupInitialMarkers = async () => {
      if (!mapLoadedRef.current && !map.loaded()) {
        await new Promise<void>((resolve) => {
          const onLoad = () => {
            mapLoadedRef.current = true
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
        }
      }

      // Create new markers only for places that don't have them
      for (const place of places) {
        if (!markersRef.current.has(place.id)) {
          const markerElement = document.createElement('div')
          markerElement.classList.add('marker')
          markerElement.style.cursor = 'pointer'
          markerElement.style.transform = 'translate(-50%, -100%)'

          const marker = new mapboxgl.Marker({
            element: markerElement,
            scale: 1,
          }).setLngLat([place.location.longitude, place.location.latitude])

          const added = await addMarkerWithRetry(marker, map)
          if (added) {
            markerElement.addEventListener('click', () => {
              requestAnimationFrame(() => {
                setCenterPlaceSpreadsheetId(place.id)
                setSelectedPlaceId(place.id)
              })
            })
            markersRef.current.set(place.id, { marker })
          }
        }
      }

      // Initial update for all markers
      throttledUpdateMarkers(places)
    }

    setupInitialMarkers().catch((error) => {
      console.error('Error in setupInitialMarkers:', error)
    })

    return () => {
      for (const [, { marker }] of markersRef.current.entries()) {
        marker.remove()
      }
      markersRef.current.clear()
      mapLoadedRef.current = false
    }
  }, [map, places])

  // Create a throttled version of updateMarkersAppearance
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const throttledUpdateMarkers = useMemo(
    () =>
      throttle(
        (places: Place[] | null) => {
          for (const place of places || []) {
            const markerRef = markersRef.current.get(place.id)
            if (!markerRef) continue

            const element = markerRef.marker.getElement()
            const isDisplayed = displayedPlaceIds.has(place.id)
            const isSelected = dataTableRowSelection[place.id] ?? false
            const isSelectedPlace = place.id === selectedPlaceId

            // Update classes
            element.classList.toggle('filtered-marker', !isDisplayed)
            element.classList.toggle('active-marker', isDisplayed)
            element.classList.toggle('selected-place-marker', isSelectedPlace)

            // Determine color
            let color = MARKER_COLORS.DEFAULT
            if (!isDisplayed) {
              color = MARKER_COLORS.FILTERED
            } else if (isSelected) {
              color = MARKER_COLORS.SELECTED
            } else if (updatedPlaceStatuses.has(place.id)) {
              const status = updatedPlaceStatuses.get(place.id)
              if (status) {
                color = getStatusColor(status, 'hex')
              }
            } else if (place.status) {
              color = getStatusColor(place.status.status, 'hex')
            }

            // Update SVG
            const svg = isDisplayed
              ? createActiveMarkerSvg(color, place, isSelectedPlace)
              : createFilteredMarkerSvg()

            if (svg && element) {
              while (element.firstChild) {
                element.removeChild(element.firstChild)
              }
              element.appendChild(svg)
            }
          }
        },
        100,
        { leading: true, trailing: true },
      ), // Additional options available
    [displayedPlaceIds, dataTableRowSelection, selectedPlaceId],
  )

  // Update the effect to use the throttled version
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!map || !places) return
    throttledUpdateMarkers(places)

    // Clear the updated statuses after applying them
    if (updatedPlaceStatuses.size > 0) {
      useMapStore.setState({ updatedPlaceStatuses: new Map() })
    }

    // Cleanup
    return () => {
      throttledUpdateMarkers.cancel()
    }
  }, [
    displayedPlaceIds,
    dataTableRowSelection,
    selectedPlaceId,
    updatedPlaceStatuses,
    throttledUpdateMarkers,
  ])

  return { markersRef }
}
