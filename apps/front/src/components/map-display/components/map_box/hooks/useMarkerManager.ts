import { useMapStore } from '@/components/map-display/store/useMapStore'
import { getStatusColor } from '@/components/status/status-colors'
import type { Place } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import { throttle } from 'lodash'
import mapboxgl from 'mapbox-gl'
import { useEffect, useMemo, useRef } from 'react'
import { MARKER_COLORS } from '../constants/markers'
import { getEmojiSvg } from '../place_marker/emojiCache'
import {
  createActiveMarkerSvg,
  createFilteredMarkerSvg,
} from '../place_marker/markerSvg'

type MarkerRef = {
  marker: mapboxgl.Marker
}

type UseMarkerManagerProps = {
  map: mapboxgl.Map | null
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
  dataTableRowSelection,
}: UseMarkerManagerProps) => {
  const {
    setCenterPlaceSpreadsheetId,
    places,
    updatedPlaceStatuses,
    displayedPlaceIds,
    setSelectedPlaceId,
    selectedPlaceId,
  } = useMapStore()
  const markersRef = useRef<Map<string, MarkerRef>>(new Map())
  const mapLoadedRef = useRef(false)

  // Add a ref to track if we have initialized markers
  const initialMarkersCreatedRef = useRef(false)

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

      // Preload emojis for better performance
      const uniqueEmojis = new Set<string>()
      for (const place of places) {
        if (place.lists?.[0]?.emoji) {
          uniqueEmojis.add(place.lists[0].emoji)
        }
      }

      // Preload emojis in parallel
      await Promise.all(
        Array.from(uniqueEmojis).map((emoji) => getEmojiSvg(emoji)),
      )

      // Create new markers only for places that don't have them
      for (const place of places) {
        if (!markersRef.current.has(place.id)) {
          const markerElement = document.createElement('div')
          markerElement.classList.add('marker')
          markerElement.style.cursor = 'pointer'
          markerElement.style.transform = 'translate(-50%, -100%)'

          // Initialize with visible style by default
          const color = place.status
            ? getColorWithCache(place.status.status)
            : MARKER_COLORS.DEFAULT

          const svg = await createActiveMarkerSvg(
            color,
            place,
            place.id === selectedPlaceId,
          )
          if (svg) {
            markerElement.appendChild(svg)
          }

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

      initialMarkersCreatedRef.current = true

      // Initial update for all markers - this now just applies styles
      // but markers are already visible
      if (places.length > 0) {
        throttledUpdateMarkers(places)
      }
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
      initialMarkersCreatedRef.current = false
    }
  }, [map, places])

  // Separate status update handler
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const updateMarkersStatus = useMemo(
    () =>
      throttle(
        async (updatedStatuses: Map<string, string>) => {
          for (const [placeId, status] of updatedStatuses.entries()) {
            const markerRef = markersRef.current.get(placeId)
            if (!markerRef) continue

            const element = markerRef.marker.getElement()
            // Consider all places displayed by default if no filtering is active
            const isDisplayed =
              displayedPlaceIds.size === 0
                ? true
                : displayedPlaceIds.has(placeId)
            const isSelectedPlace = placeId === selectedPlaceId

            // Skip if marker is filtered or selected as these have different colors
            if (!isDisplayed || isSelectedPlace) continue

            const color = getColorWithCache(status)
            const place = places?.find((p) => p.id === placeId)
            if (!place) continue
            const svg = await createActiveMarkerSvg(
              color,
              place,
              isSelectedPlace,
            )

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
      ),
    [displayedPlaceIds, selectedPlaceId],
  )

  // Main marker update function
  const throttledUpdateMarkers = useMemo(
    () =>
      throttle(
        async (places: Place[] | null) => {
          for (const place of places || []) {
            const markerRef = markersRef.current.get(place.id)
            if (!markerRef) continue

            // Consider a marker visible by default if no filtering is active
            const isDisplayed = displayedPlaceIds.has(place.id)
            const isSelected = dataTableRowSelection[place.id] ?? false
            const isSelectedPlace = place.id === selectedPlaceId

            const element = markerRef.marker.getElement()

            // Only update the marker if necessary
            const color = isSelected
              ? MARKER_COLORS.SELECTED
              : place.status
                ? getColorWithCache(place.status.status)
                : MARKER_COLORS.DEFAULT

            const svg =
              isDisplayed || displayedPlaceIds.size === 0
                ? await createActiveMarkerSvg(color, place, isSelectedPlace)
                : createFilteredMarkerSvg()

            if (svg && element) {
              // Remove only the existing SVG, not other elements
              const existingSvg = element.querySelector('svg')
              if (existingSvg) {
                element.removeChild(existingSvg)
              }
              element.appendChild(svg)

              // Update classes without removing other classes
              if (!isDisplayed) element.classList.add('filtered-marker')
              else element.classList.remove('filtered-marker')

              if (isDisplayed) element.classList.add('active-marker')
              else element.classList.remove('active-marker')

              if (isSelectedPlace)
                element.classList.add('selected-place-marker')
              else element.classList.remove('selected-place-marker')
            }
          }
        },
        100,
        { leading: true, trailing: true },
      ),
    [displayedPlaceIds, dataTableRowSelection, selectedPlaceId],
  )

  // Split the effects
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!map || !places) return

    // Only run the update if we have markers created
    if (initialMarkersCreatedRef.current) {
      throttledUpdateMarkers(places)
    }

    return () => {
      throttledUpdateMarkers.cancel()
    }
  }, [
    displayedPlaceIds,
    dataTableRowSelection,
    selectedPlaceId,
    throttledUpdateMarkers,
  ])

  // Add a dedicated effect for selection changes
  useEffect(() => {
    if (!map || !places) return

    console.log('Selection changed to:', selectedPlaceId)

    // If we have a selected place, update its size
    if (selectedPlaceId) {
      const markerRef = markersRef.current.get(selectedPlaceId)
      if (markerRef) {
        // Remove and recreate the marker with a larger scale
        const marker = markerRef.marker
        const element = marker.getElement()
        const lngLat = marker.getLngLat()

        // Apply scale to the whole marker using mapbox's scale option
        const newMarker = new mapboxgl.Marker({
          element: element,
        }).setLngLat(lngLat)

        // Replace old marker with new scaled marker
        marker.remove()
        newMarker.addTo(map)
        markersRef.current.set(selectedPlaceId, { marker: newMarker })
      }
    }

    // Reset any previously selected markers
    for (const [placeId, markerRef] of markersRef.current.entries()) {
      if (placeId !== selectedPlaceId) {
        const element = markerRef.marker.getElement()
        if (element.classList.contains('selected-place-marker')) {
          // Need to recreate the marker with normal scale
          const marker = markerRef.marker
          const lngLat = marker.getLngLat()

          // Create new marker with default scale
          const newMarker = new mapboxgl.Marker({
            element: element,
            scale: 1.0,
          }).setLngLat(lngLat)

          // Replace scaled marker with normal marker
          marker.remove()
          newMarker.addTo(map)
          markersRef.current.set(placeId, { marker: newMarker })

          console.log(`Reset scale for marker ${placeId}`)
        }
      }
    }
  }, [selectedPlaceId, places, map])

  // Separate effect for status updates
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!map || !places || updatedPlaceStatuses.size === 0) return

    updateMarkersStatus(updatedPlaceStatuses)

    // Clear the updated statuses after applying them
    useMapStore.setState({ updatedPlaceStatuses: new Map() })

    return () => {
      updateMarkersStatus.cancel()
    }
  }, [updatedPlaceStatuses])

  return { markersRef }
}
