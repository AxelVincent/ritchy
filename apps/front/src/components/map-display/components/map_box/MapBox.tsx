import './styles.css'
import { useMapInitialization } from '@/components/map-display/hooks/useMapInitialization'
import { useMapStore } from '@/components/map-display/store/useMapStore'
import { MAP_SETTINGS } from '@/components/map-display/types'
import type { MapboxLocationParameters } from '@/components/map-display/types'
import { debounce } from '@/lib/debounce'
import type { RowSelectionState } from '@tanstack/react-table'
import mapboxgl from 'mapbox-gl'
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
  const { places, selectedPlaceId, setPlaces, setDisplayedPlaceIds } =
    useMapStore()
  const previousPlacesRef = useRef<typeof places>([])
  const boundsSetRef = useRef(false)

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

  const { markersRef } = useMarkerManager({
    map: mapRef.current,
    dataTableRowSelection,
  })

  // Set bounds after places are loaded - with intelligent sampling and progressive rendering
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    // Only proceed if we have a map and places
    if (!mapRef.current || !places.length) return

    // More aggressive debounce for large datasets
    const debounceTime = places.length > 1000 ? 500 : 250

    // Debounce bounds calculation to prevent excessive updates
    const handleBoundsUpdate = debounce(() => {
      debugLog('Setting map bounds with places:', places.length)

      // Compare with previous places data to see if there's a meaningful change
      const prevIds = previousPlacesRef.current
        .map((p) => p.id)
        .sort()
        .join(',')
      const currentIds = places
        .map((p) => p.id)
        .sort()
        .join(',')

      // If no change in the data, exit early
      if (prevIds === currentIds && boundsSetRef.current) return

      // Update our reference to the current places
      previousPlacesRef.current = places

      // Only calculate bounds if we have actual changes in the data
      const bounds = new mapboxgl.LngLatBounds()
      bounds.extend(initialCenter)

      // Smart sampling for bounds calculation based on dataset size
      const getRepresentativeSample = (data: typeof places) => {
        if (data.length <= 200) return data // Use all points for smaller datasets

        // For larger datasets, use a smarter sampling strategy
        // 1. Include boundaries (min/max lat/lng) to ensure full coverage
        // 2. Include a representative sample from across the dataset

        // Sort places by latitude and longitude to find extremes
        const byLat = [...data].sort(
          (a, b) => a.location.latitude - b.location.latitude,
        )
        const byLng = [...data].sort(
          (a, b) => a.location.longitude - b.location.longitude,
        )

        // Get points from the extremes (4 corners + some near them)
        const extremePoints = new Set(
          [
            byLat[0],
            byLat[Math.floor(data.length * 0.05)], // Min lat
            byLat[Math.floor(data.length * 0.95)],
            byLat[data.length - 1], // Max lat
            byLng[0],
            byLng[Math.floor(data.length * 0.05)], // Min lng
            byLng[Math.floor(data.length * 0.95)],
            byLng[data.length - 1], // Max lng
          ]
            .filter(Boolean)
            .map((p) => p.id),
        )

        // Add systematic sampling across the dataset
        const sampleSize = Math.min(200, data.length)
        const step = Math.max(1, Math.floor(data.length / sampleSize))

        const sampledPoints = []
        for (let i = 0; i < data.length; i += step) {
          if (!extremePoints.has(data[i].id)) {
            sampledPoints.push(data[i])
          }
        }

        // Combine extreme points with sampled points
        return [
          ...Array.from(extremePoints).map((id) =>
            data.find((p) => p.id === id),
          ),
          ...sampledPoints,
        ].filter(Boolean)
      }

      const placesToUse = getRepresentativeSample(places)

      for (const place of placesToUse) {
        if (!place) continue
        const coordinates = [
          place.location.longitude,
          place.location.latitude,
        ] as [number, number]
        bounds.extend(coordinates)
      }

      // Adaptive padding based on dataset size
      const getPadding = () => {
        const base = 50
        // More padding for larger datasets, less for smaller ones
        const scaleFactor = Math.min(1.5, Math.max(0.5, places.length / 1000))
        return {
          top: base * scaleFactor,
          bottom: base * scaleFactor,
          left: base * scaleFactor,
          right: base * scaleFactor,
        }
      }

      // Function to fit bounds with a fallback strategy
      const fitMapBounds = () => {
        if (!mapRef.current) return

        try {
          // First attempt: Try to fit all points
          mapRef.current.fitBounds(bounds, {
            padding: getPadding(),
            maxZoom: places.length > 500 ? 12 : 15, // Lower max zoom for very large datasets
            duration: 800,
          })

          boundsSetRef.current = true
          debugLog('Bounds set successfully')
        } catch (error) {
          // Fallback: If bounds calculation fails, use a more conservative approach
          debugLog('Bounds calculation failed, using fallback', error)

          // Try a more conservative view centered on initial location
          mapRef.current.flyTo({
            center: initialCenter,
            zoom: 10,
            duration: 800,
          })
        }
      }

      // If map is already loaded, fit bounds immediately
      if (mapRef.current?.loaded()) {
        fitMapBounds()
      } else {
        // Otherwise wait for the load event
        mapRef.current?.once('load', fitMapBounds)
      }
    }, debounceTime)

    handleBoundsUpdate()

    return () => {
      handleBoundsUpdate.cancel()
    }
  }, [places, initialCenter])

  // Optimize selection state updates
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    debugLog('Selection state effect', {
      selectedPlaceId,
      currentSelectedPlaceIdRef,
      mapRef,
    })

    // Skip if nothing changed
    if (
      !mapRef.current ||
      selectedPlaceId === currentSelectedPlaceIdRef.current
    ) {
      return
    }

    // Reset selection if null
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

  // Update effect to store places in Zustand and initialize displayedPlaceIds
  useEffect(() => {
    if (places && places.length > 0) {
      // Initialize with all places and set all places as displayed
      setPlaces(places)

      // Explicitly initialize all places as displayed
      // This ensures markers show up immediately without waiting for DataTable
      setDisplayedPlaceIds(new Set(places.map((place) => place.id)))
    }
  }, [places, setPlaces, setDisplayedPlaceIds])

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full" />
      <Suspense fallback={<div>Loading...</div>}>
        <PlaceCard />
      </Suspense>
    </div>
  )
}
