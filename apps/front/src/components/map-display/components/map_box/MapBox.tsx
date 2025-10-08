import './styles.css'
import { useMapInitialization } from '@/components/map-display/hooks/useMapInitialization'
import { useMapStore } from '@/components/map-display/store/useMapStore'
import { MAP_SETTINGS } from '@/components/map-display/types'
import type { Location } from '@/components/search/search-map'
import { debounce } from '@/lib/debounce'
import type { Place } from '@ritchy/types'
import { type FC, useEffect, useMemo, useRef } from 'react'
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
  userLocation: Location
  filteredPlaceIds: Set<string>
}

export const MapBox: FC<MapBoxProps> = ({
  searchResults,
  userLocation,
  filteredPlaceIds,
}) => {
  const { selectedPlaceId } = useMapStore()

  debugLog('MapBox render:', { userLocation })

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const currentSelectedPlaceIdRef = useRef<string | null>(null)
  const isSelectionMovement = useRef(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const initialCenter = useMemo(() => {
    debugLog('Calculating initial center:', userLocation)
    return [userLocation.center.longitude, userLocation.center.latitude] as [
      number,
      number,
    ]
  }, [userLocation.center.latitude, userLocation.center.longitude])

  const mapRef = useMapInitialization({
    mapContainerRef,
    initialCenter,
    settings: MAP_SETTINGS,
    searchResults: searchResults ?? [],
  })

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

  const { markersRef } = useMarkerManager({
    map: mapRef.current,
    places: searchResults,
    displayedPlaceIds: filteredPlaceIds,
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

    const center = {
      lng: markerLocation.lng,
      lat: markerLocation.lat,
    }

    // Optimized animation options
    const animationOptions = {
      essential: true, // Won't be affected by reduced motion preferences
      maxDuration: 1000, // Cap animation time
    }

    // Center on the marker with the simplified adjustment
    if (distanceInDegrees > 0.2) {
      mapRef.current.jumpTo({
        center,
        zoom: zoomLevel,
      })
    } else {
      mapRef.current.flyTo({
        center,
        speed: 1,
        zoom: zoomLevel,
        ...animationOptions,
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
    </div>
  )
}
