import type {
  Place,
  PlacesSearchResponse
} from '@ritchy/types/src/api/places.ts'
import mapboxgl, { type Marker as MapboxMarker } from 'mapbox-gl'
import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { DEFAULT_LOCATION } from '../MapDisplay'
import { useMapCircle } from '../hooks/useMapCircle'
import { useMapInitialization } from '../hooks/useMapInitialization'
import { MAP_SETTINGS, RADIUS_SETTINGS } from '../types'
import { RadiusSlider } from './RadiusSlider'

interface MapBoxProps {
  onLocationChange: (location: {
    latitude: number
    longitude: number
    radiusInMeters: number
  }) => void
  searchResults: PlacesSearchResponse | null
  hoveredPlaceId: string | null
  setSelectedPlaceId: (placeId: string | null) => void
}

type MarkerData = {
  marker: MapboxMarker
  place: Place
}

export const MapBox: FC<MapBoxProps> = ({
  onLocationChange,
  searchResults,
  hoveredPlaceId,
  setSelectedPlaceId
  // onMarkerHover,
}) => {
  // Refs for DOM elements and state management
  const mapContainerRef = useRef<HTMLDivElement>(null) // Container div for map
  const markersMapRef = useRef(new Map<string, MarkerData>()) // Stores active markers
  const currentHoveredPlaceIdRef = useRef<string | null>(null) // Tracks currently hovered place

  // Default center coordinates
  const initialCenter = useMemo(
    () =>
      [DEFAULT_LOCATION.longitude, DEFAULT_LOCATION.latitude] as [
        number,
        number
      ],
    []
  )

  // State for radius control
  const [radiusInMeters, setRadiusInMeters] = useState(
    DEFAULT_LOCATION.radiusInMeters
  )

  // Initialize map and circle functionality
  const mapRef = useMapInitialization(
    mapContainerRef,
    initialCenter,
    MAP_SETTINGS
  )
  const { updateCircleData } = useMapCircle(mapRef)

  // Effect: Initialize map circle and center marker
  useEffect(() => {
    if (!mapRef.current) return

    mapRef.current.on('load', () => {
      // Add circle source for radius visualization
      mapRef.current?.addSource('circle', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { radius_m: radiusInMeters },
          geometry: {
            type: 'Point',
            coordinates: [
              mapRef.current.getCenter().lng,
              mapRef.current.getCenter().lat
            ]
          }
        }
      })

      // Add circle layer with zoom-based radius scaling
      mapRef.current?.addLayer({
        id: 'center-circle',
        type: 'circle',
        source: 'circle',
        paint: {
          // Complex radius calculation based on zoom level
          'circle-radius': [
            'interpolate',
            ['exponential', 1.75],
            ['zoom'],
            0,
            ['/', ['*', ['number', ['get', 'radius_m']], 1], 111319.9],
            22,
            [
              '*',
              ['/', ['*', ['number', ['get', 'radius_m']], 1], 111319.9],
              4194304
            ]
          ],
          'circle-color': '#007cbf',
          'circle-opacity': 0.3
        }
      })
    })

    // Add center marker and handle map movement
    const marker = new mapboxgl.Marker()
      .setLngLat(mapRef.current.getCenter())
      .addTo(mapRef.current)

    // Update marker position and notify parent of location changes
    mapRef.current.on('move', () => {
      if (mapRef.current) {
        const center = mapRef.current.getCenter()
        marker.setLngLat(center)
        updateCircleData(center, radiusInMeters)
        onLocationChange({
          latitude: center.lat,
          longitude: center.lng,
          radiusInMeters
        })
      }
    })
  }, [radiusInMeters, mapRef, updateCircleData, onLocationChange])

  // Effect: Manage search result markers
  useEffect(() => {
    // Clean up existing markers
    for (const { marker } of markersMapRef.current.values()) {
      marker.remove()
    }
    markersMapRef.current.clear()

    if (!mapRef.current || !searchResults) return

    // Create new markers for search results
    for (const place of searchResults) {
      if (place.location) {
        const marker = createMarkerWithPopup(place, '#22c55e', () =>
          setSelectedPlaceId(place.id)
        )
        marker.addTo(mapRef.current)
        markersMapRef.current.set(place.id, { marker, place })
      }
    }

    // Cleanup function
    return () => {
      for (const { marker } of markersMapRef.current.values()) {
        marker.remove()
      }
      markersMapRef.current.clear()
    }
  }, [searchResults, mapRef, setSelectedPlaceId])

  // Effect: Handle hover state and popup visibility
  useEffect(() => {
    console.log('🔄 hoveredPlaceId useEffect triggered', hoveredPlaceId)
    if (!mapRef.current) return

    // Close previous popup if exists
    if (currentHoveredPlaceIdRef.current) {
      const previousMarkerData = markersMapRef.current.get(
        currentHoveredPlaceIdRef.current
      )
      if (previousMarkerData?.marker.getPopup()?.isOpen()) {
        previousMarkerData.marker.togglePopup()
      }
    }

    // Handle new hover state
    if (!hoveredPlaceId) {
      currentHoveredPlaceIdRef.current = null
      return
    }

    // Show popup for newly hovered place
    const markerData = markersMapRef.current.get(hoveredPlaceId)
    if (!markerData?.marker.getLngLat()) return
    if (markerData.marker.getPopup()?.isOpen()) return

    markerData.marker.togglePopup()
    currentHoveredPlaceIdRef.current = hoveredPlaceId
  }, [hoveredPlaceId, mapRef])

  // Handler for radius slider changes
  const handleChange = useCallback(
    (newValue: number) => {
      setRadiusInMeters(newValue)

      if (mapRef.current) {
        const center = mapRef.current.getCenter()
        updateCircleData(center, newValue)
        onLocationChange({
          latitude: center.lat,
          longitude: center.lng,
          radiusInMeters: newValue
        })
      }
    },
    [updateCircleData, onLocationChange, mapRef]
  )

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <div ref={mapContainerRef} className="h-full w-full" />
      <RadiusSlider
        value={radiusInMeters}
        onChange={handleChange}
        settings={RADIUS_SETTINGS}
      />
    </div>
  )
}

const createMarkerWithPopup = (
  place: Place,
  color: string,
  onMouseEnter: () => void
) => {
  const popup = new mapboxgl.Popup({
    offset: 25,
    maxWidth: '300px',
    className: 'place-popup'
  }).setHTML(createPopupContent(place))

  const marker = new mapboxgl.Marker({
    color: color,
    scale: 0.8
  })
    .setLngLat([place.location.longitude, place.location.latitude])
    .setPopup(popup)

  // Track popup open/close events
  // popup.on('open', () => {
  //   console.log('🔄 popup opened', place.id)
  //   onMouseEnter() // Set the current place ID when popup opens
  // })

  // popup.on('close', () => {
  //   console.log('🔄 popup closed', place.id)
  //   onMouseLeave() // Clear the current place ID when popup closes
  // })

  // Add click handler to marker element
  marker.getElement().addEventListener('click', () => {
    console.log('🎯 marker clicked', place.id)
    onMouseEnter()
  })

  return marker
}

const createPopupContent = (place: Place) => {
  return `
    <div class="p-3 max-w-sm">
      <h3 class="font-bold text-lg mb-2">${place.displayName}</h3>
      ${
        place.rating
          ? `
        <div class="mb-2">
          ⭐ ${place.rating.toFixed(1)} ${place.userRatingCount ? `(${place.userRatingCount} reviews)` : ''}
        </div>
      `
          : ''
      }
      <p class="text-sm mb-2">${place.shortFormattedAddress}</p>
      ${
        place.currentOpeningHours
          ? `
        <div class="text-sm ${place.currentOpeningHours.openNow ? 'text-green-600' : 'text-red-600'}">
          ${place.currentOpeningHours.openNow ? 'Open now' : 'Closed'}
        </div>
      `
          : ''
      }
      <div class="mt-2">
        <a href="${place.googleMapsUri}" target="_blank" class="text-blue-500 text-sm hover:underline">
          View on Google Maps
        </a>
      </div>
    </div>
  `
}
