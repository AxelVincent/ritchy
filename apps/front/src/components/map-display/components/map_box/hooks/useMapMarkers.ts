import {
  createEmptyFeatureCollection,
  markersToGeoJSON,
} from '@/components/map-display/utils/markerTransforms'
import type { UserPlaceMarker } from '@api/shared'
import type { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl'
import mapboxgl from 'mapbox-gl'
import { useEffect, useRef, useState } from 'react'

const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string

if (!accessToken) {
  throw new Error('Mapbox access token is required')
}

// Source and layer IDs
const SOURCE_ID = 'markers-source'
const CLUSTER_LAYER_ID = 'clusters'
const CLUSTER_COUNT_LAYER_ID = 'cluster-count'
const POINT_LAYER_ID = 'unclustered-point'
const SELECTION_LAYER_ID = 'selected-point'

// Map styles for light/dark mode
const MAP_STYLES = {
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
} as const

// Cluster styling adapts to theme
const CLUSTER_STYLES = {
  light: {
    color: '#1e293b', // slate-800 - dark clusters on light map
    textColor: '#ffffff',
    textHaloColor: 'rgba(0, 0, 0, 0.3)',
  },
  dark: {
    color: '#e2e8f0', // slate-200 - light clusters on dark map
    textColor: '#1e293b',
    textHaloColor: 'rgba(255, 255, 255, 0.3)',
  },
} as const

interface UseMapMarkersOptions {
  containerRef: React.RefObject<HTMLDivElement>
  markers: UserPlaceMarker[] | undefined
  selectedPlaceId: string | null
  onMarkerClick: (placeId: string) => void
  initialCenter: [number, number]
  initialZoom?: number
  isDarkMode?: boolean
}

interface UseMapMarkersReturn {
  isReady: boolean
}

/**
 * Consolidated hook for map marker management.
 * Clean, status-colored circle markers.
 */
export const useMapMarkers = ({
  containerRef,
  markers,
  selectedPlaceId,
  onMarkerClick,
  initialCenter,
  initialZoom = 10,
  isDarkMode = false,
}: UseMapMarkersOptions): UseMapMarkersReturn => {
  const mapRef = useRef<MapboxMap | null>(null)
  const [isReady, setIsReady] = useState(false)

  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick

  const previousSelectedId = useRef<string | null>(null)
  const hasInitialBoundsFit = useRef(false)
  const isFirstThemeRender = useRef(true)

  // Refs for values needed in theme effect without triggering re-runs
  const markersRef = useRef(markers)
  markersRef.current = markers
  const selectedPlaceIdRef = useRef(selectedPlaceId)
  selectedPlaceIdRef.current = selectedPlaceId

  // Initialize map and layers
  // biome-ignore lint/correctness/useExhaustiveDependencies: we only want to run this once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const { offsetWidth, offsetHeight } = containerRef.current
    if (offsetWidth === 0 || offsetHeight === 0) {
      console.warn('Map container has zero dimensions, skipping initialization')
      return
    }

    // Use initial theme for first render
    const initialTheme = isDarkMode ? 'dark' : 'light'
    const initialMapStyle = MAP_STYLES[initialTheme]
    const initialClusterStyle = CLUSTER_STYLES[initialTheme]

    mapboxgl.accessToken = accessToken

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: initialMapStyle,
      center: initialCenter,
      zoom: initialZoom,
      maxZoom: 20,
      minZoom: 1,
      projection: 'mercator',
      renderWorldCopies: false,
      fadeDuration: 100,
    })

    mapRef.current = map

    // Controls
    map.addControl(new mapboxgl.NavigationControl())
    map.addControl(new mapboxgl.FullscreenControl())
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
    )

    map.once('load', () => {
      // GeoJSON source with clustering
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: createEmptyFeatureCollection(),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 30,
      })

      // Cluster circles - theme-aware styling
      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': initialClusterStyle.color,
          'circle-opacity': 0.9,
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            16,
            10,
            20,
            50,
            26,
            100,
            32,
          ],
        },
      })

      // Cluster count labels - theme-aware text
      map.addLayer({
        id: CLUSTER_COUNT_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 13,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': initialClusterStyle.textColor,
          'text-halo-color': initialClusterStyle.textHaloColor,
          'text-halo-width': 1,
        },
      })

      // Selection highlight (behind marker) - uses same color as marker status
      map.addLayer({
        id: SELECTION_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        filter: [
          'all',
          ['!', ['has', 'point_count']],
          ['==', ['get', 'id'], ''],
        ],
        paint: {
          'circle-radius': 16,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.3,
        },
      })

      // Main marker layer - clean circles colored by status
      map.addLayer({
        id: POINT_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            10,
            7,
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      // Click handler for markers
      map.on('click', POINT_LAYER_ID, (e: mapboxgl.MapLayerMouseEvent) => {
        if (!e.features?.length) return
        const placeId = e.features[0].properties?.id
        if (placeId) {
          onMarkerClickRef.current(placeId)
        }
      })

      // Click handler for clusters
      map.on('click', CLUSTER_LAYER_ID, (e: mapboxgl.MapLayerMouseEvent) => {
        if (!e.features?.length) return
        const geometry = e.features[0].geometry
        if (geometry.type !== 'Point') return

        map.easeTo({
          center: geometry.coordinates as [number, number],
          zoom: map.getZoom() + 2,
          duration: 500,
        })
      })

      // Cursor handlers
      map.on('mouseenter', POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('mouseenter', CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = ''
      })

      setIsReady(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
      setIsReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update source data when markers change and fit bounds on first load
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isReady) return

    const source = map.getSource(SOURCE_ID) as GeoJSONSource
    if (!source) return

    const geojson = markers
      ? markersToGeoJSON(markers)
      : createEmptyFeatureCollection()
    source.setData(geojson)

    // Fit bounds to all markers on first load
    if (!hasInitialBoundsFit.current && markers && markers.length > 0) {
      hasInitialBoundsFit.current = true

      const bounds = new mapboxgl.LngLatBounds()
      for (const marker of markers) {
        bounds.extend([marker.location.longitude, marker.location.latitude])
      }

      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15,
        duration: 0,
      })
    }
  }, [markers, isReady])

  // Handle selection changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isReady) return

    // Clear previous selection
    if (previousSelectedId.current) {
      map.setFeatureState(
        { source: SOURCE_ID, id: previousSelectedId.current },
        { selected: false },
      )
    }

    // Set new selection
    if (selectedPlaceId) {
      map.setFeatureState(
        { source: SOURCE_ID, id: selectedPlaceId },
        { selected: true },
      )

      // Update selection highlight filter
      map.setFilter(SELECTION_LAYER_ID, [
        'all',
        ['!', ['has', 'point_count']],
        ['==', ['get', 'id'], selectedPlaceId],
      ])

      // Center on selected marker
      if (markers) {
        const marker = markers.find((m) => m.id === selectedPlaceId)
        if (marker) {
          const coords: [number, number] = [
            marker.location.longitude,
            marker.location.latitude,
          ]

          const center = map.getCenter()
          const currentZoom = map.getZoom()
          const distance = Math.sqrt(
            (center.lng - coords[0]) ** 2 + (center.lat - coords[1]) ** 2,
          )

          // Target zoom: at least 15, or keep current if already zoomed in more
          const targetZoom = Math.max(15, currentZoom)

          if (distance > 0.2) {
            // Far away - jump instantly
            map.jumpTo({ center: coords, zoom: Math.max(15, targetZoom) })
          } else if (distance > 0.001) {
            // Nearby but not centered - smooth pan without zoom change
            map.easeTo({ center: coords, zoom: targetZoom, duration: 500 })
          }
          // If already centered (distance <= 0.001), do nothing
        }
      }
    } else {
      // Hide selection highlight
      map.setFilter(SELECTION_LAYER_ID, [
        'all',
        ['!', ['has', 'point_count']],
        ['==', ['get', 'id'], ''],
      ])
    }

    previousSelectedId.current = selectedPlaceId
  }, [selectedPlaceId, isReady, markers])

  // Handle resize with debounce to prevent flickering
  // biome-ignore lint/correctness/useExhaustiveDependencies: we only want to run this once
  useEffect(() => {
    const map = mapRef.current
    const container = containerRef.current
    if (!map || !container) return

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null

    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize calls to prevent flickering
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        map.resize()
      }, 100)
    })
    resizeObserver.observe(container)

    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeObserver.disconnect()
    }
  }, [isReady, containerRef])

  // Handle theme changes (skip first render - initialization already set the correct theme)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isReady) return

    // Skip first render - the map was already initialized with the correct theme
    if (isFirstThemeRender.current) {
      isFirstThemeRender.current = false
      return
    }

    const themeKey = isDarkMode ? 'dark' : 'light'
    const newMapStyle = MAP_STYLES[themeKey]
    const newClusterStyle = CLUSTER_STYLES[themeKey]

    // Update map style
    map.setStyle(newMapStyle)

    // Re-add layers after style change
    map.once('style.load', () => {
      const currentMarkers = markersRef.current
      const currentSelectedId = selectedPlaceIdRef.current

      // Re-add source if it doesn't exist
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: currentMarkers
            ? markersToGeoJSON(currentMarkers)
            : createEmptyFeatureCollection(),
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        })
      }

      // Re-add cluster layer
      if (!map.getLayer(CLUSTER_LAYER_ID)) {
        map.addLayer({
          id: CLUSTER_LAYER_ID,
          type: 'circle',
          source: SOURCE_ID,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': newClusterStyle.color,
            'circle-opacity': 0.9,
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              16,
              10,
              20,
              50,
              26,
              100,
              32,
            ],
          },
        })
      }

      // Re-add cluster count layer
      if (!map.getLayer(CLUSTER_COUNT_LAYER_ID)) {
        map.addLayer({
          id: CLUSTER_COUNT_LAYER_ID,
          type: 'symbol',
          source: SOURCE_ID,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
            'text-size': 13,
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': newClusterStyle.textColor,
            'text-halo-color': newClusterStyle.textHaloColor,
            'text-halo-width': 1,
          },
        })
      }

      // Re-add selection layer - uses same color as marker status
      if (!map.getLayer(SELECTION_LAYER_ID)) {
        map.addLayer({
          id: SELECTION_LAYER_ID,
          type: 'circle',
          source: SOURCE_ID,
          filter: [
            'all',
            ['!', ['has', 'point_count']],
            ['==', ['get', 'id'], currentSelectedId ?? ''],
          ],
          paint: {
            'circle-radius': 16,
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.3,
          },
        })
      }

      // Re-add point layer
      if (!map.getLayer(POINT_LAYER_ID)) {
        map.addLayer({
          id: POINT_LAYER_ID,
          type: 'circle',
          source: SOURCE_ID,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              10,
              7,
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        })
      }

      // Re-apply selection state if there was one
      if (currentSelectedId) {
        map.setFeatureState(
          { source: SOURCE_ID, id: currentSelectedId },
          { selected: true },
        )
      }
    })
    // Only re-run when isDarkMode changes - use refs for other values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDarkMode, isReady])

  return { isReady }
}
