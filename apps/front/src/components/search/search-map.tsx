import { useMapInitialization } from '@/components/map-display/hooks/useMapInitialization'
import { MAP_SETTINGS } from '@/components/map-display/types'

import { debounce } from '@/lib/debounce'
import type { GeocodeLocation } from '@ritchy/types'
import mapboxgl from 'mapbox-gl'
import { type FC, useCallback, useEffect, useRef } from 'react'

// Search map uses streets style for better landmark visibility
const SEARCH_MAP_SETTINGS = {
  ...MAP_SETTINGS,
  style: 'mapbox://styles/mapbox/streets-v12',
}

type center = {
  latitude: number
  longitude: number
}

type bounds = {
  northEast: center
  southWest: center
}

export type Location = {
  center: center
  bounds: bounds
}

// Improve props interface with more specific types
interface MapBoxProps {
  userLocation: Location
  selectedPlace?: GeocodeLocation | null
  updateSearchParams: (
    updates: Partial<{
      mode: 'keyword' | 'unique'
      keyword: string
      placeName: string
      model: 'BASIC' | 'ENHANCED'
      northEastLat: number
      northEastLng: number
      southWestLat: number
      southWestLng: number
      lng: number
    }>,
  ) => void
}

const calculateAspectRatioBounds = (map: mapboxgl.Map) => {
  const bounds = map.getBounds()
  if (!bounds) return null
  const ne = bounds.getNorthEast()
  const sw = bounds.getSouthWest()

  // Get container dimensions
  const container = map.getContainer()
  const containerRect = container.getBoundingClientRect()

  // Add container readiness check
  if (containerRect.width === 0 || containerRect.height === 0) {
    return bounds
  }

  const { width, height } = containerRect
  const isPortrait = height > width

  if (isPortrait) {
    // For portrait (mobile), adjust the longitude bounds to match height/width ratio
    const lat = ne.lat - sw.lat
    const lng = ne.lng - sw.lng
    const targetRatio = width / height

    // Adjust longitude spread to match container ratio
    const newLngSpread = lat * targetRatio
    const lngDiff = (newLngSpread - lng) / 2

    return new mapboxgl.LngLatBounds(
      [sw.lng - lngDiff, sw.lat],
      [ne.lng + lngDiff, ne.lat],
    )
  }

  return bounds
}

export const SearchMap: FC<MapBoxProps> = ({
  userLocation,
  selectedPlace,
  updateSearchParams,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const uniquePlaceMarkerRef = useRef<mapboxgl.Marker | null>(null)

  const initialCenter = useRef<[number, number]>([
    userLocation.center.longitude,
    userLocation.center.latitude,
  ]).current

  const mapRef = useMapInitialization({
    mapContainerRef,
    initialCenter,
    settings: SEARCH_MAP_SETTINGS,
    searchResults: [],
  })

  // Create unique place marker
  const createUniquePlaceMarker = useCallback(
    (place: GeocodeLocation) => {
      if (!mapRef.current) return

      // Remove existing unique place marker
      if (uniquePlaceMarkerRef.current) {
        uniquePlaceMarkerRef.current.remove()
      }

      // Create custom marker element
      const markerElement = document.createElement('div')
      markerElement.className = 'unique-place-marker'
      markerElement.innerHTML = `
      <div class="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full border-2 border-white shadow-lg">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
        </svg>
      </div>
    `

      // Create marker
      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: 'center',
      })
        .setLngLat([place.geometry.location.lng, place.geometry.location.lat])
        .addTo(mapRef.current)

      uniquePlaceMarkerRef.current = marker

      // Add popup with place information
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
      })

      marker.setPopup(popup)
    },
    [mapRef],
  )

  // Handle unique place marker updates
  useEffect(() => {
    if (selectedPlace) {
      createUniquePlaceMarker(selectedPlace)
    } else {
      // Remove marker when no place is selected
      if (uniquePlaceMarkerRef.current) {
        uniquePlaceMarkerRef.current.remove()
        uniquePlaceMarkerRef.current = null
      }
    }
  }, [selectedPlace, createUniquePlaceMarker])

  // Resize observer effect
  useEffect(() => {
    if (!mapRef.current || !mapContainerRef.current) {
      return
    }

    const debouncedResize = debounce(() => {
      mapRef.current?.resize()
    }, 300)

    const resizeObserver = new ResizeObserver(debouncedResize)
    resizeObserver.observe(mapContainerRef.current)

    return () => {
      if (mapContainerRef.current) {
        resizeObserver.unobserve(mapContainerRef.current)
      }
      resizeObserver.disconnect()
      debouncedResize.cancel()
    }
  }, [mapRef])

  // Handle moveend events for immediate processing when animation completes
  // biome-ignore lint/correctness/useExhaustiveDependencies: //
  const handleMapMoveEnd = useCallback(() => {
    if (!mapRef.current) return

    const map = mapRef.current
    const center = map.getCenter()
    const bounds = calculateAspectRatioBounds(map)

    // Add validation checks
    if (
      !bounds ||
      !center ||
      !Number.isFinite(center.lat) ||
      !Number.isFinite(center.lng)
    ) {
      console.warn('Invalid map coordinates detected:', { bounds, center })
      return
    }

    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()

    updateSearchParams({
      northEastLat: ne.lat,
      northEastLng: ne.lng,
      southWestLat: sw.lat,
      southWestLng: sw.lng,
    })
  }, [])

  // Set up map movement handlers once
  // biome-ignore lint/correctness/useExhaustiveDependencies: //
  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    const map = mapRef.current
    map.on('moveend', handleMapMoveEnd)

    return () => {
      map.off('moveend', handleMapMoveEnd)
    }
  }, [])

  // Track the previous userLocation to detect intentional changes (not from map movement)
  const prevUserLocationRef = useRef(userLocation)

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    const map = mapRef.current
    const currentLocation = userLocation
    map.fitBounds(
      [
        [
          currentLocation.bounds.southWest.longitude,
          currentLocation.bounds.southWest.latitude,
        ],
        [
          currentLocation.bounds.northEast.longitude,
          currentLocation.bounds.northEast.latitude,
        ],
      ],
      {
        duration: 500,
      },
    )

    prevUserLocationRef.current = currentLocation
  }, [userLocation])

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      if (uniquePlaceMarkerRef.current) {
        uniquePlaceMarkerRef.current.remove()
      }
    }
  }, [])

  return <div ref={mapContainerRef} className="h-full w-full" />
}
