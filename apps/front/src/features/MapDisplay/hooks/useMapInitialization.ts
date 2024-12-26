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
) => {
  const mapRef = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    // Set access token
    mapboxgl.accessToken = accessToken

    // Initialize map
    try {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: settings.style,
        center: initialCenter,
        zoom: settings.zoom,
        maxZoom: settings.maxZoom,
        minZoom: settings.minZoom,
      })

      // Add error handling
      mapRef.current.on('error', (e) => {
        console.error('Mapbox error:', e)
      })

      // Initialize controls
      const controls: IControl[] = [
        new MapboxGeocoder({
          accessToken: mapboxgl.accessToken,
          marker: false,
          flyTo: { duration: 0 },
          mapboxgl,
          collapsed: true,
          enableGeolocation: true,
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

      // Add controls to map
      for (const control of controls) {
        mapRef.current?.addControl(control)
      }
    } catch (error) {
      console.error('Failed to initialize map:', error)
      throw error
    }

    // Cleanup
    return () => {
      mapRef.current?.remove()
    }
  }, [initialCenter, settings, mapContainerRef])

  return mapRef
}
