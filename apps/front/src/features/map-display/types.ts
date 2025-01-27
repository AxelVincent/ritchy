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
  maxZoom: 30,
  minZoom: 5,
}

export const RADIUS_SETTINGS: RadiusSettings = {
  min: 500,
  max: 50000,
  step: 500,
  initial: 5000,
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

export interface MapboxLocationParameters {
  latitude: number
  longitude: number
  radiusInMeters: number
}

export interface ViewStyle {
  mapStyle: { flex: string }
  dataStyle: { flex: string }
}

export interface MapDisplayProps {
  defaultLocation?: MapboxLocationParameters
}
