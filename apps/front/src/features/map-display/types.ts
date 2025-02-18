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

export const MAP_SETTINGS: MapSettings = {
  style: 'mapbox://styles/mapbox/streets-v12',
  zoom: 10,
  maxZoom: 20,
  minZoom: 2,
}

export const RADIUS_SETTINGS: RadiusSettings = {
  min: 500,
  step: 500,
  initial: 5000,
  max: 50000, // Default max for FREE/NAVIGATOR plans
}

export const PLAN_RADIUS_LIMITS = {
  FREE: 50000,
  NAVIGATOR: 50000,
  EXPLORER: 100000,
  PRO: 150000,
} as const

export interface MapboxLocationParameters {
  latitude: number
  longitude: number
  radiusInMeters: number
}
