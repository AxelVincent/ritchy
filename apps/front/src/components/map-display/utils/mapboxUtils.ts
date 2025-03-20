import mapboxgl, { type RequestTransformFunction } from 'mapbox-gl'
import { MAP_PERFORMANCE_OPTIONS } from '../types'

/**
 * Initialize Mapbox global performance settings
 * Call this function before any map instances are created
 */
export const initMapboxPerformanceSettings = (): void => {
  // Set mapbox global options from our configuration
  mapboxgl.maxParallelImageRequests =
    MAP_PERFORMANCE_OPTIONS.maxParallelImageRequests
  mapboxgl.workerCount = MAP_PERFORMANCE_OPTIONS.workerCount

  // Prewarm resources for faster initial map load
  mapboxgl.prewarm()

  // Set RTL text plugin with lazy loading
  mapboxgl.setRTLTextPlugin(
    'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.0/mapbox-gl-rtl-text.js',
    null,
    true, // Lazy load when needed
  )
}

/**
 * Clear Mapbox cache and storage
 * @param callback Optional callback function to handle errors
 */
export const clearMapboxCache = (
  callback?: (err?: Error | null) => void,
): void => {
  mapboxgl.clearStorage((err) => {
    if (err) {
      console.error('Error clearing Mapbox storage:', err)
    }
    if (callback) {
      callback(err || undefined)
    }
  })
}

/**
 * Clean up prewarmed resources - call when user is unlikely to return to map view
 */
export const cleanupMapboxResources = (): void => {
  mapboxgl.clearPrewarmedResources()
}

/**
 * Transform request for performance monitoring
 * Matches the Mapbox GL JS RequestTransformFunction signature
 */
export const transformMapboxRequest: RequestTransformFunction = (
  url,
  resourceType,
) => {
  if (
    resourceType === 'Tile' ||
    resourceType === 'Image' ||
    resourceType === 'Source'
  ) {
    return {
      url,
      collectResourceTiming: MAP_PERFORMANCE_OPTIONS.collectResourceTiming,
    }
  }
  return { url }
}
