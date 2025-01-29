import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import mapboxgl, { type IControl } from 'mapbox-gl'
import { useEffect, useRef } from 'react'
import type { MapSettings } from '../types'

const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string

if (!accessToken) {
  throw new Error('Mapbox access token is required')
}

export const useMapInitialization = (
  mapContainerRef: React.RefObject<HTMLDivElement>,
  initialCenter: [number, number],
  settings: MapSettings,
  isSearch: boolean,
) => {
  const mapRef = useRef<mapboxgl.Map | null>(null)

  // Run initialization only once
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Set access token
    mapboxgl.accessToken = accessToken

    // Initialize map with touch event handling
    try {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: settings.style,
        center: initialCenter,
        zoom: settings.zoom,
        maxZoom: settings.maxZoom,
        minZoom: settings.minZoom,
      })

      // Add passive touch event listeners
      if (mapContainerRef.current) {
        mapContainerRef.current.addEventListener('touchmove', () => {}, {
          passive: true,
        })
        mapContainerRef.current.addEventListener('touchstart', () => {}, {
          passive: true,
        })
      }

      // Add error handling
      mapRef.current.on('error', (e) => {
        console.error('Mapbox error:', e)
      })

      let controls: IControl[] = []

      if (!isSearch) {
        // Initialize controls
        controls = [
          new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            marker: false,
            flyTo: { duration: 0 },
            mapboxgl,
            placeholder: 'Location',
          }) as IControl,
          new mapboxgl.NavigationControl(),
          new mapboxgl.FullscreenControl(),
          new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true,
            fitBoundsOptions: { maxZoom: 15, animate: false },
          }),
        ]
      } else {
        controls = [
          new mapboxgl.NavigationControl(),
          new mapboxgl.FullscreenControl(),
          new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true,
          }),
        ]
      }

      // Add controls to map
      for (const control of controls) {
        mapRef.current?.addControl(control)
      }

      // Log all measurements
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
  }, []) // Empty dependency array - run only once

  // Handle updates to center without reinitializing
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setCenter(initialCenter)
  }, [initialCenter])

  // Handle updates to settings without reinitializing
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setStyle(settings.style)
    mapRef.current.setMaxZoom(settings.maxZoom)
    mapRef.current.setMinZoom(settings.minZoom)
    mapRef.current.setZoom(settings.zoom)
  }, [settings])

  return mapRef
}
