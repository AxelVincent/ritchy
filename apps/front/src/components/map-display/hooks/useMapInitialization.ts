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

  return mapRef
}
