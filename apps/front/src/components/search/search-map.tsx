import { useMapInitialization } from '@/components/map-display/hooks/useMapInitialization'
import { MAP_SETTINGS } from '@/components/map-display/types'

import { debounce } from '@/lib/debounce'
import type { GeocodeLocation } from '@ritchy/types'
import mapboxgl from 'mapbox-gl'
import { type FC, useCallback, useEffect, useMemo, useRef } from 'react'

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
  onLocationChange: (location: Location) => void
  userLocation: Location
  selectedPlace?: GeocodeLocation | null
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
  onLocationChange,
  userLocation,
  selectedPlace,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const centerMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const uniquePlaceMarkerRef = useRef<mapboxgl.Marker | null>(null)

  // Track programmatic moves to prevent infinite loops
  const isProgrammaticMoveRef = useRef(false)
  const lastUserLocationRef = useRef<Location | null>(null)
  const pendingMoveUpdateRef = useRef<NodeJS.Timeout | null>(null)

  // Add a ref to track if the location change came from map interaction
  const isMapInteractionRef = useRef(false)
  const mapInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const initialCenter = useMemo(() => {
    return [userLocation.center.longitude, userLocation.center.latitude] as [
      number,
      number,
    ]
  }, [userLocation.center.latitude, userLocation.center.longitude])

  const initialBounds = useMemo(() => {
    return new mapboxgl.LngLatBounds(
      [
        userLocation.bounds.southWest.longitude,
        userLocation.bounds.southWest.latitude,
      ],
      [
        userLocation.bounds.northEast.longitude,
        userLocation.bounds.northEast.latitude,
      ],
    )
  }, [userLocation.bounds])

  const mapRef = useMapInitialization({
    mapContainerRef,
    initialCenter,
    settings: MAP_SETTINGS,
    initialBounds,
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
    // Skip if this is a programmatic move
    if (isProgrammaticMoveRef.current) {
      return
    }

    if (!mapRef.current) return

    // Clear any existing timeout
    if (mapInteractionTimeoutRef.current) {
      clearTimeout(mapInteractionTimeoutRef.current)
    }

    // Set flag to indicate this location change came from map interaction
    isMapInteractionRef.current = true

    // Clear any pending timeout since we have the final values now
    if (pendingMoveUpdateRef.current) {
      clearTimeout(pendingMoveUpdateRef.current)
      pendingMoveUpdateRef.current = null
    }

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

    // Validate bound coordinates
    if (
      !Number.isFinite(ne.lat) ||
      !Number.isFinite(ne.lng) ||
      !Number.isFinite(sw.lat) ||
      !Number.isFinite(sw.lng)
    ) {
      console.warn('Invalid bounds coordinates:', { ne, sw })
      return
    }

    // Add bounds width validation
    const width = Math.abs(ne.lng - sw.lng)
    if (width > 180) {
      console.warn('Viewport too wide, skipping update:', width)
      return
    }

    // Ensure coordinates are within valid ranges
    const normalizedRectangle = {
      northEast: {
        latitude: Math.min(Math.max(ne.lat, -90), 90),
        longitude: Math.min(Math.max(ne.lng, -180), 180),
      },
      southWest: {
        latitude: Math.min(Math.max(sw.lat, -90), 90),
        longitude: Math.min(Math.max(sw.lng, -180), 180),
      },
    }

    centerMarkerRef.current?.setLngLat(center)
    onLocationChange({
      center: {
        latitude: center.lat,
        longitude: center.lng,
      },
      bounds: normalizedRectangle,
    })

    // Reset the flag after the debounced function has had time to execute
    // The debounce is 1000ms, so we wait 1100ms to be safe
    mapInteractionTimeoutRef.current = setTimeout(() => {
      isMapInteractionRef.current = false
    }, 1000)
  }, [onLocationChange])

  // Set up map movement handlers once
  // biome-ignore lint/correctness/useExhaustiveDependencies: //
  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    const map = mapRef.current
    // map.on('move', handleMapMove)
    map.on('moveend', handleMapMoveEnd)

    return () => {
      // map.off('move', handleMapMove)
      map.off('moveend', handleMapMoveEnd)

      // Clean up pending timeout
      if (pendingMoveUpdateRef.current) {
        clearTimeout(pendingMoveUpdateRef.current)
      }
    }
  }, [handleMapMoveEnd])

  // Handle userLocation changes - only update map if it's a meaningful change
  // biome-ignore lint/correctness/useExhaustiveDependencies: //
  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    lastUserLocationRef.current = userLocation
    const map = mapRef.current

    // Set flag to indicate programmatic move
    isProgrammaticMoveRef.current = true

    map.fitBounds(
      [
        [
          userLocation.bounds.southWest.longitude,
          userLocation.bounds.southWest.latitude,
        ],
        [
          userLocation.bounds.northEast.longitude,
          userLocation.bounds.northEast.latitude,
        ],
      ],
      {
        maxZoom: 16,
        duration: 500,
      },
    )

    setTimeout(() => {
      isProgrammaticMoveRef.current = false
    }, 600)
  }, [userLocation])

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      if (uniquePlaceMarkerRef.current) {
        uniquePlaceMarkerRef.current.remove()
      }
    }
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mapInteractionTimeoutRef.current) {
        clearTimeout(mapInteractionTimeoutRef.current)
      }
    }
  }, [])

  return <div ref={mapContainerRef} className="h-full w-full" />
}
