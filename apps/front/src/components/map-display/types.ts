export interface MapSettings {
  style: string
  zoom: number
  maxZoom: number
  minZoom: number
}

export interface RadiusSettings {
  min: number
  max: number
  step: number
  initial: number
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

export const MAP_SETTINGS: MapSettings = {
  style: 'mapbox://styles/mapbox/streets-v12',
  zoom: 10,
  maxZoom: 20,
  minZoom: 1,
}

export const RADIUS_SETTINGS: RadiusSettings = {
  min: 500,
  step: 500,
  initial: 5000,
  max: 50000, // Default max for FREE/NAVIGATOR plans
}
