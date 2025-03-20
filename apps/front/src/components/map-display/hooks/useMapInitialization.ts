import { useIsMobile } from '@/hooks/use-mobile'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import type { Place } from '@ritchy/types'
import mapboxgl, { type IControl } from 'mapbox-gl'
import { useEffect, useRef } from 'react'
import type { MapSettings } from '../types'
import { MAP_PERFORMANCE_OPTIONS } from '../types'
import { transformMapboxRequest } from '../utils/mapboxUtils'

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

const calculateInitialBounds = (
  initialCenter: [number, number],
  searchResults?: Place[],
): mapboxgl.LngLatBounds => {
  if (searchResults) {
    const bounds = new mapboxgl.LngLatBounds()
    bounds.extend(initialCenter)

    for (const place of searchResults) {
      const coordinates = [
        place.location.longitude,
        place.location.latitude,
      ] as [number, number]
      bounds.extend(coordinates)
    }

    return bounds
  }

  return new mapboxgl.LngLatBounds(initialCenter, initialCenter)
}

export const useMapInitialization = (
  mapContainerRef: React.RefObject<HTMLDivElement>,
  initialCenter: [number, number],
  settings: MapSettings,
  searchResults?: Place[],
) => {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const isMobile = useIsMobile()

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Set global accessToken
    mapboxgl.accessToken = accessToken

    // Track performance
    performance.mark('map-init-start')

    try {
      const initialBounds = calculateInitialBounds(initialCenter, searchResults)

      // Initialize map with performance options
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: settings.style,
        center: initialCenter,
        zoom: settings.zoom,
        maxZoom: settings.maxZoom,
        minZoom: settings.minZoom,
        renderWorldCopies: MAP_PERFORMANCE_OPTIONS.renderWorldCopies,
        fadeDuration: MAP_PERFORMANCE_OPTIONS.fadeDuration,
        localIdeographFontFamily:
          MAP_PERFORMANCE_OPTIONS.localIdeographFontFamily,
        transformRequest: transformMapboxRequest,
        ...(initialBounds && {
          bounds: initialBounds,
          fitBoundsOptions: {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            maxZoom: 15,
          },
        }),
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
      const controls = createControls(searchResults)
      for (const control of controls) {
        mapRef.current?.addControl(control)
      }

      // Log performance measurements
      mapRef.current.once('load', () => {
        performance.mark('map-init-end')
        performance.measure(
          'map-initialization',
          'map-init-start',
          'map-init-end',
        )

        // Log all performance measurements
        const measurements = performance.getEntriesByType('measure')
        console.table(
          measurements.map((m) => ({
            name: m.name,
            duration: `${m.duration.toFixed(2)}ms`,
          })),
        )

        // If resource timing is enabled, log tile loading performance
        if (MAP_PERFORMANCE_OPTIONS.collectResourceTiming) {
          mapRef.current?.on('data', (e) => {
            // Check if the event contains tile resource timing data
            // @ts-expect-error MapSourceDataEvent may include resourceTiming when collectResourceTiming is set
            if (e.dataType === 'source' && e.tile && e.resourceTiming) {
              // @ts-expect-error MapSourceDataEvent may include resourceTiming when collectResourceTiming is set
              console.debug('Tile timing:', e.resourceTiming)
            }
          })
        }
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

  // Handle updates to search results
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!mapRef.current || !searchResults?.length) return

    const bounds = new mapboxgl.LngLatBounds()
    bounds.extend(initialCenter)

    for (const place of searchResults) {
      const coordinates = [
        place.location.longitude,
        place.location.latitude,
      ] as [number, number]
      bounds.extend(coordinates)
    }

    mapRef.current.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      maxZoom: 15,
      duration: 500,
    })
  }, [searchResults])

  // Handle updates to isMobile state
  useEffect(() => {
    if (!mapContainerRef.current) return

    if (isMobile) {
      mapContainerRef.current.classList.add('mobile-map-container')
    } else {
      mapContainerRef.current.classList.remove('mobile-map-container')
    }
  }, [isMobile, mapContainerRef.current])

  return mapRef
}
