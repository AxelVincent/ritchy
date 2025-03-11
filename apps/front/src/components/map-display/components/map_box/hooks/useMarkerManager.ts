import { useMapStore } from '@/components/map-display/store/useMapStore'
import { getStatusColor } from '@/components/status/status-colors'
import type { Place } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import mapboxgl from 'mapbox-gl'
import { useEffect, useRef } from 'react'
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

// Move this outside the component to avoid recreating on each render

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

  // Store previous values to prevent unnecessary updates
  const prevPlacesRef = useRef<Place[] | null>(null)
  const prevDisplayedPlaceIdsRef = useRef<Set<string>>(new Set())
  const prevSelectionRef = useRef<RowSelectionState>({})

  // Use places from the store if available, otherwise fall back to props
  const places = storePlaces.length > 0 ? storePlaces : propPlaces

  // Main effect for marker management
  useEffect(() => {
    if (!map || !places) return

    // Check if we actually need to update
    const placesChanged = prevPlacesRef.current !== places
    const displayedIdsChanged = !setsAreEqual(
      prevDisplayedPlaceIdsRef.current,
      displayedPlaceIds,
    )
    const selectionChanged = !objectsAreEqual(
      prevSelectionRef.current,
      dataTableRowSelection,
    )

    if (
      !placesChanged &&
      !displayedIdsChanged &&
      !selectionChanged &&
      updatedPlaceStatuses.size === 0 &&
      !selectedPlaceId
    ) {
      return
    }

    // Update refs for next comparison
    prevPlacesRef.current = places
    prevDisplayedPlaceIdsRef.current = new Set(displayedPlaceIds)
    prevSelectionRef.current = { ...dataTableRowSelection }

    const setupMarkers = async () => {
      // Wait for map to be loaded if needed
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
      // Update existing markers and create new ones
      const currentPlaceIds = new Set(places.map((place) => place.id))

      // Remove stale markers
      for (const [id, { marker }] of markersRef.current.entries()) {
        if (!currentPlaceIds.has(id)) {
          marker.remove()
          markersRef.current.delete(id)
        }
      }

      // Update or create markers
      for (const place of places) {
        const isDisplayed = displayedPlaceIds.has(place.id)
        const isSelected = dataTableRowSelection[place.id] ?? false
        const isSelectedPlace = place.id === selectedPlaceId
        const existing = markersRef.current.get(place.id)

        // Check if this place has an updated status
        const updatedStatus = updatedPlaceStatuses.get(place.id)

        let color = MARKER_COLORS.DEFAULT
        if (!isDisplayed) {
          color = MARKER_COLORS.FILTERED
        } else if (isSelected) {
          color = MARKER_COLORS.SELECTED
        } else if (updatedStatus) {
          // Use the updated status color when available
          color = getStatusColor(updatedStatus, 'hex')
        } else if (place.status) {
          // Use original status color
          color = getStatusColor(place.status.status, 'hex')
        }

        if (!existing) {
          try {
            // Create new marker
            const markerElement = document.createElement('div')
            markerElement.classList.add('marker')
            markerElement.style.cursor = 'pointer'
            markerElement.style.transform = 'translate(-50%, -100%)'
            markerElement.classList.add(
              isDisplayed ? 'active-marker' : 'filtered-marker',
            )

            // Add a class for the selected place
            if (isSelectedPlace) {
              markerElement.classList.add('selected-place-marker')
            }

            const svg = isDisplayed
              ? createActiveMarkerSvg(color, place, isSelectedPlace)
              : createFilteredMarkerSvg()

            if (svg) {
              markerElement.appendChild(svg)
            }

            // Create marker without popup
            const marker = new mapboxgl.Marker({
              element: markerElement,
              scale: 1,
            }).setLngLat([place.location.longitude, place.location.latitude])

            // Use retry logic when adding marker to map
            const added = await addMarkerWithRetry(marker, map)
            if (added) {
              markerElement.addEventListener('click', () => {
                requestAnimationFrame(() => {
                  setCenterPlaceSpreadsheetId(place.id)
                  setSelectedPlaceId(place.id) // Set the selected place ID when marker is clicked
                })
              })
              markersRef.current.set(place.id, { marker })
            }
          } catch (error) {
            console.error('Error creating marker for place:', place.id, error)
          }
        } else {
          // Update existing marker
          const element = existing.marker.getElement()
          element.classList.toggle('filtered-marker', !isDisplayed)
          element.classList.toggle('active-marker', isDisplayed)
          element.classList.toggle('selected-place-marker', isSelectedPlace)

          const svg = isDisplayed
            ? createActiveMarkerSvg(color, place, isSelectedPlace)
            : createFilteredMarkerSvg()

          if (svg && element) {
            while (element.firstChild) {
              element.removeChild(element.firstChild)
            }
            element.appendChild(svg)
          }

          existing.marker.setLngLat([
            place.location.longitude,
            place.location.latitude,
          ])
        }
      }
    }

    setupMarkers().catch((error) => {
      console.error('Error in setupMarkers:', error)
    })

    // Clear the updated statuses after applying them
    if (updatedPlaceStatuses.size > 0) {
      useMapStore.setState({ updatedPlaceStatuses: new Map() })
    }
  }, [
    map,
    places,
    displayedPlaceIds,
    dataTableRowSelection,
    setCenterPlaceSpreadsheetId,
    updatedPlaceStatuses,
    setSelectedPlaceId,
    selectedPlaceId,
  ])

  // Cleanup effect - only run on unmount
  useEffect(() => {
    return () => {
      for (const [, { marker }] of markersRef.current.entries()) {
        marker.remove()
      }
      markersRef.current.clear()
      mapLoadedRef.current = false
    }
  }, [])

  return {
    markersRef,
  }
}

// Helper functions for comparison
function setsAreEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const item of a) {
    if (!b.has(item)) return false
  }
  return true
}

function objectsAreEqual(a: RowSelectionState, b: RowSelectionState): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => a[key] === b[key])
}
