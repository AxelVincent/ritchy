export interface MapSettings {
  style: string
  zoom: number
  maxZoom: number
  minZoom: number
}

export interface MapPerformanceOptions {
  maxParallelImageRequests: number
  workerCount: number
  renderWorldCopies: boolean
  fadeDuration: number
  localIdeographFontFamily: string
  collectResourceTiming: boolean
}

export const MAP_PERFORMANCE_OPTIONS: MapPerformanceOptions = {
  maxParallelImageRequests: 6, // Default is 16, lower for bandwidth savings
  workerCount: 4, // Adjust based on application needs
  renderWorldCopies: false, // Disable if not needed
  fadeDuration: 100, // Faster transitions (default 300ms)
  localIdeographFontFamily: "'Noto Sans', 'Noto Sans CJK SC', sans-serif", // Faster CJK rendering
  collectResourceTiming: true,
}

// Theme-aware map styles
export const MAP_STYLES = {
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
} as const

export const MAP_SETTINGS: MapSettings = {
  style: MAP_STYLES.light, // Default to light, will be overridden by theme
  zoom: 10,
  maxZoom: 20,
  minZoom: 1,
}
