import './styles.css'
import { useMapInitialization } from '@/components/map-display/hooks/useMapInitialization'
import { useMapStore } from '@/components/map-display/store/useMapStore'
import { MAP_SETTINGS } from '@/components/map-display/types'
import type { MapboxLocationParameters } from '@/components/map-display/types'
import { debounce } from '@/lib/debounce'
import type { Place } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import { type FC, Suspense, lazy, useEffect, useMemo, useRef } from 'react'
import { useMarkerManager } from './hooks/useMarkerManager'

const DEBUG = false

const debugLog = (...args: unknown[]) => {
  if (DEBUG) {
    console.log('[MapBox]', ...args)
  }
}

// Improve props interface with more specific types
interface MapBoxProps {
  searchResults: Place[] | null
  userLocation: MapboxLocationParameters
  dataTableRowSelection: RowSelectionState
  radiusInMeters: number
  filteredPlaceIds: Set<string>
}

// Move PlaceCard to a separate lazy-loaded component
const PlaceCard = lazy(() =>
  import('./place-details/PlaceCard').then((module) => ({
    default: module.PlaceCard,
  })),
)

export const MapBox: FC<MapBoxProps> = ({
  searchResults,
  userLocation,
  dataTableRowSelection,
  radiusInMeters,
  filteredPlaceIds,
}) => {
  // Get selectedPlaceId and setSelectedPlaceId from the store
  const { selectedPlaceId } = useMapStore()

  debugLog('MapBox render:', { userLocation, radiusInMeters })

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const currentSelectedPlaceIdRef = useRef<string | null>(null)
  const isSelectionMovement = useRef(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const initialCenter = useMemo(() => {
    debugLog('Calculating initial center:', userLocation)
    return [userLocation.longitude, userLocation.latitude] as [number, number]
  }, [userLocation.latitude, userLocation.longitude])

  const mapRef = useMapInitialization(
    mapContainerRef,
    initialCenter,
    MAP_SETTINGS,
    searchResults ?? [],
  )

  // Resize observer effect
  useEffect(() => {
    debugLog('Setting up resize observer')
    if (!mapRef.current || !mapContainerRef.current) {
      debugLog('Resize observer: Missing refs')
      return
    }

    const debouncedResize = debounce(() => {
      debugLog('Resizing map')
      mapRef.current?.resize()
    }, 250)

    const resizeObserver = new ResizeObserver(debouncedResize)
    resizeObserver.observe(mapContainerRef.current)

    return () => {
      debugLog('Cleaning up resize observer')
      if (mapContainerRef.current) {
        resizeObserver.unobserve(mapContainerRef.current)
      }
      resizeObserver.disconnect()
      debouncedResize.cancel()
    }
  }, [mapRef])

  // Replace the useMarkerManager call to remove popup-related functionality
  const { markersRef } = useMarkerManager({
    map: mapRef.current,
    places: searchResults,
    displayedPlaceIds: filteredPlaceIds,
    dataTableRowSelection,
  })

  // Selection state effect
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    debugLog('Selection state effect', {
      selectedPlaceId,
      currentSelectedPlaceIdRef,
      mapRef,
    })
    if (!mapRef.current || !selectedPlaceId) {
      debugLog('Selection state skipped: no map or no selection')
      return
    }

    isSelectionMovement.current = true

    if (!selectedPlaceId) {
      currentSelectedPlaceIdRef.current = null
      return
    }

    const markerData = markersRef.current.get(selectedPlaceId)
    if (!markerData?.marker.getLngLat()) {
      debugLog('No marker location found for selection')
      return
    }

    const markerLocation = markerData.marker.getLngLat()

    // Calculate the distance between current center and marker
    const currentCenter = mapRef.current.getCenter()
    const distanceInDegrees = Math.sqrt(
      (currentCenter.lng - markerLocation.lng) ** 2 +
        (currentCenter.lat - markerLocation.lat) ** 2,
    )

    // Get the place card height from localStorage or use a default value
    const placeCardHeight = Number.parseInt(
      localStorage.getItem('placeCardHeight') || '200',
      10,
    )

    // Get the map container height
    const mapHeight = mapContainerRef.current?.clientHeight || 0

    // Calculate the vertical padding needed to position the marker above the card
    // This positions the marker in the upper portion of the visible map area
    const bottomPadding = placeCardHeight + 20 // Add some extra padding (20px)
    const topPadding = 50 // Some padding from the top

    debugLog('Padding calculation:', {
      placeCardHeight,
      bottomPadding,
      mapHeight,
    })

    const zoomLevel = 15

    // If distance is too large, jump to location instead of animating
    if (distanceInDegrees > 0.2) {
      mapRef.current.jumpTo({
        center: markerLocation,
        zoom: zoomLevel,
        padding: { bottom: bottomPadding, top: topPadding, left: 0, right: 0 },
      })
    } else {
      // Use flyTo for shorter distances with padding
      mapRef.current.flyTo({
        center: markerLocation,
        speed: 1,
        zoom: zoomLevel,
        padding: { bottom: bottomPadding, top: topPadding, left: 0, right: 0 },
      })
    }

    currentSelectedPlaceIdRef.current = selectedPlaceId

    // Reset flag after movement completes
    const onMoveEnd = () => {
      isSelectionMovement.current = false
      mapRef.current?.off('moveend', onMoveEnd)
    }
    mapRef.current.on('moveend', onMoveEnd)
  }, [selectedPlaceId])

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full" />
      <Suspense fallback={<div>Loading...</div>}>
        <PlaceCard
          places={searchResults}
          displayedPlaceIds={filteredPlaceIds}
        />
      </Suspense>
    </div>
  )
}
