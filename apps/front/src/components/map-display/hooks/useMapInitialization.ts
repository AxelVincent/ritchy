import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import type { Place } from '@ritchy/types'
import mapboxgl, { type IControl } from 'mapbox-gl'
import { useEffect, useRef } from 'react'
import { useMapStore } from '../store/useMapStore'
import type { MapSettings } from '../types'

const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string

if (!accessToken) {
  throw new Error('Mapbox access token is required')
}

const createControls = (searchResults?: Place[]): IControl[] => {
  const baseControls = [
    new mapboxgl.NavigationControl(),
    new mapboxgl.FullscreenControl(),
    new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
      fitBoundsOptions: { maxZoom: 15, animate: false },
    }),
  ]

  if (searchResults) {
    return [
      new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        marker: false,
        flyTo: { duration: 0 },
        mapboxgl,
        placeholder: 'Location',
        responsive: true,
      }) as IControl,
      ...baseControls,
    ]
  }

  return baseControls
}

export const useMapInitialization = (
  mapContainerRef: React.RefObject<HTMLDivElement>,
  initialCenter: [number, number],
  settings: MapSettings,
  isMobile: boolean,
) => {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const { places } = useMapStore()
  const previousPlacesRef = useRef<Place[]>([])
  const boundsSetRef = useRef(false)

  // Initial map setup
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    mapboxgl.accessToken = accessToken

    try {
      // Initialize map
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: settings.style,
        center: initialCenter,
        zoom: settings.zoom,
        maxZoom: settings.maxZoom,
        minZoom: settings.minZoom,
      })

      // Add passive touch events
      const touchOptions = { passive: true }
      mapContainerRef.current.addEventListener(
        'touchmove',
        () => {},
        touchOptions,
      )
      mapContainerRef.current.addEventListener(
        'touchstart',
        () => {},
        touchOptions,
      )

      // Add error handling
      mapRef.current.on('error', (e) => {
        console.error('Mapbox error:', e)
      })
      // Add controls
      const controls = createControls(places)
      for (const control of controls) {
        mapRef.current?.addControl(control)
      }

      // Add mobile-specific class to container
      if (isMobile && mapContainerRef.current) {
        mapContainerRef.current.classList.add('mobile-map-container')
      }

      // Log performance measurements
      mapRef.current.once('load', () => {
        const measurements = performance.getEntriesByType('measure')
        console.table(
          measurements.map((m) => ({
            name: m.name,
            duration: `${m.duration.toFixed(2)}ms`,
          })),
        )
      })
    } catch (error) {
      console.error('Failed to initialize map:', error)
      throw error
    }

    return () => {
      mapContainerRef.current?.removeEventListener('touchmove', () => {})
      mapContainerRef.current?.removeEventListener('touchstart', () => {})
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // Handle updates to center
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setCenter(initialCenter)
  }, [initialCenter])

  // Handle updates to settings
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setStyle(settings.style)
    mapRef.current.setMaxZoom(settings.maxZoom)
    mapRef.current.setMinZoom(settings.minZoom)
    mapRef.current.setZoom(settings.zoom)
  }, [settings])

  // Set bounds when places data changes
  const runOnce = useRef(false)
  useEffect(() => {
    // Only proceed if we have a map and places
    if (!mapRef.current || !places.length) return
    if (runOnce.current) return
    runOnce.current = true

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

    const bounds = new mapboxgl.LngLatBounds()
    bounds.extend(initialCenter)

    for (const place of places) {
      const coordinates = [
        place.location.longitude,
        place.location.latitude,
      ] as [number, number]
      bounds.extend(coordinates)
    }

    // Function to fit bounds
    const fitMapBounds = () => {
      if (!mapRef.current) return

      mapRef.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15,
        duration: 500,
      })

      boundsSetRef.current = true
    }

    // If map is already loaded, fit bounds immediately
    if (mapRef.current.loaded()) {
      fitMapBounds()
    } else {
      // Otherwise wait for the load event
      mapRef.current.once('load', fitMapBounds)
    }
  }, [places, initialCenter])

  return mapRef
}
