import { useIsMobile } from '@/hooks/use-mobile'
import type { Place } from '@api/shared'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
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

export const useMapInitialization = ({
  mapContainerRef,
  initialCenter,
  settings,
  initialBounds,
  searchResults,
}: {
  mapContainerRef: React.RefObject<HTMLDivElement>
  initialCenter: [number, number]
  settings: MapSettings
  initialBounds?: mapboxgl.LngLatBounds
  searchResults?: Place[]
}) => {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const isMobile = useIsMobile()
  const firstRender = useRef(true)

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Check if container has valid dimensions (prevents WebGL context errors)
    const { offsetWidth, offsetHeight } = mapContainerRef.current
    if (offsetWidth === 0 || offsetHeight === 0) {
      console.warn('Map container has zero dimensions, skipping initialization')
      return
    }

    // Set global accessToken
    mapboxgl.accessToken = accessToken

    // Track performance
    performance.mark('map-init-start')

    try {
      // Check WebGL support before attempting to create map
      const canvas = document.createElement('canvas')
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) {
        console.error('WebGL is not supported in this browser')
        return
      }

      // Use initialBounds if provided, otherwise calculate from initialCenter
      const bounds = searchResults
        ? calculateInitialBounds(initialCenter, searchResults)
        : initialBounds

      // Initialize map with performance options
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: settings.style,
        center: initialCenter,
        zoom: settings.zoom,
        maxZoom: settings.maxZoom,
        minZoom: settings.minZoom,
        projection: 'mercator',
        renderWorldCopies: MAP_PERFORMANCE_OPTIONS.renderWorldCopies,
        fadeDuration: MAP_PERFORMANCE_OPTIONS.fadeDuration,
        localIdeographFontFamily:
          MAP_PERFORMANCE_OPTIONS.localIdeographFontFamily,
        transformRequest: transformMapboxRequest,
        bounds: bounds,
        fitBoundsOptions: {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15,
        },
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
      const controls = createControls(undefined) // Pass undefined as searchResults is now handled by initialBounds
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

  // Handle updates to search results and bounds
  useEffect(() => {
    if (!mapRef.current) return

    // Calculate bounds from search results if available
    const bounds =
      searchResults && searchResults.length > 0
        ? calculateInitialBounds(initialCenter, searchResults)
        : initialBounds

    if (!bounds) return

    // Only calculate and fit bounds on first render for initialBounds
    // Always update bounds when search results change
    if (!firstRender.current && !searchResults) {
      return
    }

    // Wait for the map to be fully loaded before setting bounds
    if (!mapRef.current.loaded()) {
      mapRef.current.once('load', () => {
        mapRef.current?.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15,
          duration: 500,
        })

        firstRender.current = false
      })
    } else {
      // Map is already loaded, set bounds immediately
      mapRef.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15,
        duration: 500,
      })

      firstRender.current = false
    }
  }, [initialBounds, searchResults, initialCenter])

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
