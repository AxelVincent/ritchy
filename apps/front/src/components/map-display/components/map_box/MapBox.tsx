import './styles.css'
import { useMapInitialization } from '@/components/map-display/hooks/useMapInitialization'
import { useMapStore } from '@/components/map-display/store/useMapStore'
import { MAP_SETTINGS } from '@/components/map-display/types'
import type { MapboxLocationParameters } from '@/components/map-display/types'
import { debounce } from '@/lib/debounce'
import type { RowSelectionState } from '@tanstack/react-table'
import { type FC, Suspense, lazy, useEffect, useMemo, useRef } from 'react'
import { useMarkerManager } from './hooks/useMarkerManager'

const DEBUG = false

const debugLog = (...args: unknown[]) => {
  if (DEBUG) {
    console.log('[MapBox]', ...args)
  }
}

// Update props to remove unnecessary props
interface MapBoxProps {
  userLocation: MapboxLocationParameters
  dataTableRowSelection: RowSelectionState
  radiusInMeters: number
  isMobile: boolean
}

// Move PlaceCard to a separate lazy-loaded component
const PlaceCard = lazy(() =>
  import('./place-details/PlaceCard').then((module) => ({
    default: module.PlaceCard,
  })),
)

export const MapBox: FC<MapBoxProps> = ({
  userLocation,
  dataTableRowSelection,
  radiusInMeters,
  isMobile,
}) => {
  // Get all data from the store instead of props
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
    isMobile,
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

  // Replace the useMarkerManager call to use store data directly
  const { markersRef } = useMarkerManager({
    map: mapRef.current,
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
    if (!mapRef.current) {
      debugLog('Selection state skipped: no map')
      return
    }

    if (!selectedPlaceId) {
      currentSelectedPlaceIdRef.current = null
      return
    }

    isSelectionMovement.current = true

    const markerData = markersRef.current.get(selectedPlaceId)
    if (!markerData?.marker.getLngLat()) {
      debugLog('No marker location found for selection')
      return
    }

    const markerLocation = markerData.marker.getLngLat()
    const currentCenter = mapRef.current.getCenter()
    const distanceInDegrees = Math.sqrt(
      (currentCenter.lng - markerLocation.lng) ** 2 +
        (currentCenter.lat - markerLocation.lat) ** 2,
    )

    // Fixed zoom level
    const zoomLevel = 15

    // Get the place card height
    const placeCardHeight = Number.parseInt(
      localStorage.getItem('placeCardHeight') || '200',
      10,
    )

    // Simple fixed offset based on zoom level 15
    // At zoom level 15, approximately 0.001 degrees of latitude is a good small offset
    // Adjust slightly based on card height (larger cards need slightly more offset)
    const baseOffset = -0.0025
    const cardSizeFactor = Math.min(1.5, Math.max(0.2, placeCardHeight / 200))
    const latOffset = baseOffset * cardSizeFactor

    // Adjust center point slightly upward
    const adjustedCenter = {
      lng: markerLocation.lng,
      lat: markerLocation.lat + latOffset,
    }

    // Center on the marker with the simplified adjustment
    if (distanceInDegrees > 0.2) {
      mapRef.current.jumpTo({
        center: adjustedCenter,
        zoom: zoomLevel,
      })
    } else {
      mapRef.current.flyTo({
        center: adjustedCenter,
        speed: 1,
        zoom: zoomLevel,
      })
    }

    currentSelectedPlaceIdRef.current = selectedPlaceId

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
        <PlaceCard />
      </Suspense>
    </div>
  )
}
