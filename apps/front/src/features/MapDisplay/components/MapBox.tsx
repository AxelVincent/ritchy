import type { Place, PlacesSearchResponse } from '@ritchy/types'
import mapboxgl, { type Marker as MapboxMarker } from 'mapbox-gl'
import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { DEFAULT_LOCATION } from '../MapDisplay'
import { useMapInitialization } from '../hooks/useMapInitialization'
import { useMapSquare } from '../hooks/useMapSquare'
import { MAP_SETTINGS, RADIUS_SETTINGS } from '../types'
import { PlacePopup } from './PlacePopup'
import { RadiusSlider } from './RadiusSlider'
import '../styles.css'
import { createRoot } from 'react-dom/client'

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
  setMapBoxHoveredPlaceId,
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
        number,
      ],
    [],
  )

  // State for radius control
  const [radiusInMeters, setRadiusInMeters] = useState(
    DEFAULT_LOCATION.radiusInMeters,
  )

  // Initialize map and circle functionality
  const mapRef = useMapInitialization(
    mapContainerRef,
    initialCenter,
    MAP_SETTINGS,
  )
  const { calculateSquareCoordinates, updateSquareData } = useMapSquare(mapRef)

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
              mapRef.current.getCenter().lat,
            ],
          },
        },
      })

      // Add square source
      mapRef.current?.addSource('square', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { radius_m: radiusInMeters },
          geometry: {
            type: 'Polygon',
            coordinates: [
              calculateSquareCoordinates(
                mapRef.current.getCenter(),
                radiusInMeters,
              ),
            ],
          },
        },
      })

      // Add square fill layer
      mapRef.current?.addLayer({
        id: 'center-square',
        type: 'fill',
        source: 'square',
        paint: {
          'fill-color': 'blue', // Different color to distinguish from circle
          'fill-opacity': 0.1,
        },
      })

      // Add square border layer
      mapRef.current?.addLayer({
        id: 'center-square-border',
        type: 'line',
        source: 'square',
        paint: {
          'line-color': 'blue',
          'line-width': 1,
        },
      })
    })

    updateSquareData(mapRef.current.getCenter(), radiusInMeters)

    // Add center marker and handle map movement
    const marker = new mapboxgl.Marker()
      .setLngLat(mapRef.current.getCenter())
      .addTo(mapRef.current)

    // Update marker position and notify parent of location changes
    mapRef.current.on('move', () => {
      if (mapRef.current) {
        const center = mapRef.current.getCenter()
        marker.setLngLat(center)
        updateSquareData(center, radiusInMeters)
        onLocationChange({
          latitude: center.lat,
          longitude: center.lng,
          radiusInMeters,
        })
      }
    })
  }, [
    radiusInMeters,
    mapRef,
    updateSquareData,
    onLocationChange,
    calculateSquareCoordinates,
  ])

  // Effect: Manage search result markers
  useEffect(() => {
    // Clean up existing markers
    for (const { marker } of markersMapRef.current.values()) {
      marker.remove()
    }
    markersMapRef.current.clear()

    if (!mapRef.current || !searchResults) return
    console.log('🔄 searchResults useEffect triggered', searchResults)

    // Create new markers for search results
    for (const place of searchResults) {
      if (place.location) {
        const marker = createMarkerWithPopup(
          place,
          '#22c55e',
          setSelectedPlaceId,
          setMapBoxHoveredPlaceId,
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
      dataTableHoveredPlaceId,
    )
    if (!mapRef.current) return

    // Close previous popup if exists
    if (currentHoveredPlaceIdRef.current) {
      const previousMarkerData = markersMapRef.current.get(
        currentHoveredPlaceIdRef.current,
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
        updateSquareData(center, newValue)
        onLocationChange({
          latitude: center.lat,
          longitude: center.lng,
          radiusInMeters: newValue,
        })
      }
    },
    [updateSquareData, onLocationChange, mapRef],
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
  setMapBoxHoveredPlaceId: (placeId: string | null) => void,
) => {
  // Create a DOM node for React to render into
  const popupNode = document.createElement('div')

  const popup = new mapboxgl.Popup({
    offset: 25,
    maxWidth: '300px',
  })

  // Use React 18's createRoot API
  const root = createRoot(popupNode)
  root.render(<PlacePopup place={place} />)

  popup.setDOMContent(popupNode)

  const marker = new mapboxgl.Marker({
    color: color,
    scale: 0.8,
  })
    .setLngLat([place.location.longitude, place.location.latitude])
    .setPopup(popup)

  const element = marker.getElement()
  // Add hover handlers to marker element
  element.addEventListener('mouseenter', () => {
    // console.log('🎯 marker hovered', place.id)
    setMapBoxHoveredPlaceId(place.id)
  })

  element.addEventListener('mouseleave', () => {
    // console.log('🎯 marker unhovered', place.id)
    setMapBoxHoveredPlaceId(null)
  })

  // Add click handler to marker element
  element.addEventListener('click', () => {
    // console.log('🎯 marker clicked', place.id)
    setSelectedPlaceId(place.id)
  })

  // Add click handler for the popup close button
  popup.on('open', () => {
    const closeButton = document.querySelector('.mapboxgl-popup-close-button')
    closeButton?.addEventListener('click', () => {
      // console.log('🎯 popup close button clicked', place.id)
      setSelectedPlaceId(null)
    })
  })

  return marker
}
