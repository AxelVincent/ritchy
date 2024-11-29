import type { Place, PlacesSearchResponse } from '@ritchy/types'
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
  dataTableHoveredPlaceId: string | null
  setSelectedPlaceId: (placeId: string | null) => void
  viewMode: 'map' | 'data' | 'equal'
  setMapBoxHoveredPlaceId: (placeId: string | null) => void
}

type MarkerData = {
  marker: MapboxMarker
  place: Place
}

export const MapBox: FC<MapBoxProps> = ({
  onLocationChange,
  searchResults,
  dataTableHoveredPlaceId,
  setSelectedPlaceId,
  viewMode,
  setMapBoxHoveredPlaceId
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

  // Step 2: Update map size on view mode change
  useEffect(() => {
    if (!mapRef.current) return
    console.log('🔄 viewMode useEffect triggered', viewMode)
    mapRef.current.resize() // Resize the map to fit the new container size
  }, [viewMode, mapRef]) // Step 3: Add viewMode as a dependency

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
        const marker = createMarkerWithPopup(
          place,
          '#22c55e',
          setSelectedPlaceId,
          setMapBoxHoveredPlaceId
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
  }, [searchResults, mapRef, setSelectedPlaceId, setMapBoxHoveredPlaceId])

  // Effect: Handle hover state and popup visibility
  useEffect(() => {
    console.log(
      '🔄 hoveredPlaceId useEffect triggered',
      dataTableHoveredPlaceId
    )
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
    if (!dataTableHoveredPlaceId) {
      currentHoveredPlaceIdRef.current = null
      return
    }

    // Show popup for newly hovered place
    const markerData = markersMapRef.current.get(dataTableHoveredPlaceId)
    if (!markerData?.marker.getLngLat()) return
    if (markerData.marker.getPopup()?.isOpen()) return

    markerData.marker.togglePopup()
    currentHoveredPlaceIdRef.current = dataTableHoveredPlaceId
  }, [dataTableHoveredPlaceId, mapRef])

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
    <>
      <div ref={mapContainerRef} className="h-screen w-full" />
      <RadiusSlider
        value={radiusInMeters}
        onChange={handleChange}
        settings={RADIUS_SETTINGS}
      />
    </>
  )
}

const createMarkerWithPopup = (
  place: Place,
  color: string,
  setSelectedPlaceId: (placeId: string | null) => void,
  setMapBoxHoveredPlaceId: (placeId: string | null) => void
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

  const element = marker.getElement()
  // Add hover handlers to marker element
  element.addEventListener('mouseenter', () => {
    console.log('🎯 marker hovered', place.id)
    setMapBoxHoveredPlaceId(place.id)
  })

  // Add click handler to marker element
  element.addEventListener('click', () => {
    console.log('🎯 marker clicked', place.id)
    setSelectedPlaceId(place.id)
  })

  // Add click handler for the popup close button
  popup.on('open', () => {
    const closeButton = document.querySelector('.mapboxgl-popup-close-button')
    closeButton?.addEventListener('click', () => {
      console.log('🎯 popup close button clicked', place.id)
      setSelectedPlaceId(null)
    })
  })

  return marker
}

const createPopupContent = (place: Place) => {
  return `
    <div class="p-4 max-w-sm text-black">
      <h3 class="scroll-m-20 text-lg font-semibold tracking-tight mb-2 text-black">${place.displayName}</h3>
      ${
        place.rating
          ? `
        <div class="flex items-center gap-1 mb-2 text-sm">
          <span class="text-yellow-500">★</span>
          <span class="text-black">${place.rating.toFixed(1)}</span>
          ${place.userRatingCount ? `<span class="text-gray-600">(${place.userRatingCount} reviews)</span>` : ''}
        </div>
      `
          : ''
      }
      <p class="text-sm text-gray-600 mb-2">${place.shortFormattedAddress}</p>
      ${
        place.currentOpeningHours
          ? `
        <div class="text-sm ${
          place.currentOpeningHours.openNow
            ? 'text-emerald-600'
            : 'text-red-600'
        }">
          ${place.currentOpeningHours.openNow ? 'Open now' : 'Closed'}
        </div>
      `
          : ''
      }
      <div class="mt-3">
        <a 
          href="${place.googleMapsUri}" 
          target="_blank" 
          class="text-sm text-blue-600 hover:underline inline-flex items-center"
        >
          View on Google Maps
          <span class="ml-1">↗</span>
        </a>
      </div>
    </div>
  `
}
