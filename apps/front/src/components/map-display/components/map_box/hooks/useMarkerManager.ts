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
  const initialMarkersCreatedRef = useRef(false)

  // Add operation queue
  const operationQueueRef = useRef<Array<() => Promise<void>>>([])
  const isProcessingQueueRef = useRef(false)

  // Queue processor function
  const processQueue = async () => {
    if (isProcessingQueueRef.current || operationQueueRef.current.length === 0)
      return

    isProcessingQueueRef.current = true

    try {
      // Process one operation at a time
      const operation = operationQueueRef.current.shift()
      if (operation) {
        await operation()
      }
    } catch (error) {
      console.error('Error processing marker operation:', error)
    } finally {
      isProcessingQueueRef.current = false

      // Continue processing if there are more operations
      if (operationQueueRef.current.length > 0) {
        processQueue()
      }
    }
  }

  // Queue an operation
  const queueMarkerOperation = (operation: () => Promise<void>) => {
    operationQueueRef.current.push(operation)
    processQueue()
  }

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

          // Initialize with visible style by default
          const color = place.status
            ? getColorWithCache(place.status.status)
            : MARKER_COLORS.DEFAULT

          const svg = createActiveMarkerSvg(
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
  // Main marker update function
  const throttledUpdateMarkers = useMemo(
    () =>
      throttle(
        (places: Place[] | null) => {
          for (const place of places || []) {
            const markerRef = markersRef.current.get(place.id)
            if (!markerRef) continue

            // Consider a marker visible by default if no filtering is active
            const isDisplayed =
              displayedPlaceIds.size === 0
                ? true
                : displayedPlaceIds.has(place.id)
            const isSelected = dataTableRowSelection[place.id] ?? false
            const isFocused = place.id === selectedPlaceId

            const element = markerRef.marker.getElement()

            // Only update the marker if necessary
            const color = isSelected
              ? MARKER_COLORS.SELECTED
              : place.status
                ? getColorWithCache(place.status.status)
                : MARKER_COLORS.DEFAULT

            const svg =
              isDisplayed || displayedPlaceIds.size === 0
                ? createActiveMarkerSvg(color, place, isFocused)
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

              if (isSelected) element.classList.add('selected-place-marker')
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

  // Selection changes - now queued
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!map || !places || !initialMarkersCreatedRef.current) return

    queueMarkerOperation(async () => {
      console.log('Processing selection change', selectedPlaceId)

      // Update newly selected marker
      if (selectedPlaceId) {
        await updateMarker(selectedPlaceId, {
          isSelected: false,
          isFocused: true,
        })
      }

      // Reset previously selected markers
      for (const placeId of markersRef.current.keys()) {
        if (placeId !== selectedPlaceId) {
          await updateMarker(placeId, { isSelected: false })
        }
      }
    })
  }, [selectedPlaceId, places, map])

  // Status updates - now queued
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (
      !map ||
      !places ||
      updatedPlaceStatuses.size === 0 ||
      !initialMarkersCreatedRef.current
    )
      return

    queueMarkerOperation(async () => {
      console.log('Processing status updates', updatedPlaceStatuses.size)

      // Process each status update
      for (const [placeId] of updatedPlaceStatuses.entries()) {
        await updateMarker(placeId, { statusChanged: true })
      }

      // Only clear statuses after successful updates
      useMapStore.setState({ updatedPlaceStatuses: new Map() })
    })
  }, [updatedPlaceStatuses])

  const updateMarker = async (
    placeId: string,
    options: {
      isSelected?: boolean
      statusChanged?: boolean
      isFocused?: boolean
      isDisplayed?: boolean
    },
  ) => {
    const markerRef = markersRef.current.get(placeId)
    if (!markerRef || !map) return false

    try {
      const place = places.find((p) => p.id === placeId)
      if (!place) return false

      const marker = markerRef.marker
      const element = marker.getElement()

      // Update visual appearance
      const color = options.isSelected
        ? MARKER_COLORS.SELECTED
        : place.status
          ? getColorWithCache(place.status.status)
          : MARKER_COLORS.DEFAULT

      const svg =
        options.isDisplayed !== false
          ? createActiveMarkerSvg(color, place, options.isFocused)
          : createFilteredMarkerSvg()

      // Update DOM safely
      const existingSvg = element.querySelector('svg')
      if (existingSvg) {
        element.removeChild(existingSvg)
      }
      element.appendChild(svg)

      // Update CSS classes
      if (options.isDisplayed === false)
        element.classList.add('filtered-marker')
      else element.classList.remove('filtered-marker')

      if (options.isDisplayed !== false) element.classList.add('active-marker')
      else element.classList.remove('active-marker')

      if (options.isSelected) element.classList.add('selected-place-marker')
      else element.classList.remove('selected-place-marker')

      // Update scale without recreating the marker
      if (options.isSelected !== undefined) {
        // Just update the scale rather than recreating
        const newScale = options.isSelected ? 1.2 : 1.0

        // Apply scale transform directly to the element
        element.style.transform = `translate(-50%, -100%) scale(${newScale})`
      }

      return true
    } catch (error) {
      console.error(`Error updating marker ${placeId}:`, error)
      return false
    }
  }

  return { markersRef }
}
