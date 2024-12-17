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
  zoom: 12,
  maxZoom: 17,
  minZoom: 7,
}

export const RADIUS_SETTINGS: RadiusSettings = {
  min: 100,
  max: 150000,
  step: 100,
  initial: 100,
}

export interface MapCircleData {
  type: 'Feature'
  properties: {
    radius_m: number
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

export interface MapBoxProps {
  initialCenter?: [number, number]
}

export interface CircleLayerData {
  type: 'Feature'
  properties: {
    radius_m: number
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

export interface MapLayerConfig {
  circleLayer: {
    id: string
    paint: mapboxgl.CirclePaint
  }
}

export interface Location {
  latitude: number
  longitude: number
  radiusInMeters: number
}

export type ViewMode = 'map' | 'data' | 'equal'

export interface ViewStyle {
  mapStyle: { flex: string }
  dataStyle: { flex: string }
}

export interface MapDisplayProps {
  defaultLocation?: Location
}
