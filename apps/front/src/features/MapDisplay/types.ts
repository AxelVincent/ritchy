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
  zoom: 13,
  maxZoom: 17,
  minZoom: 9,
}

export const RADIUS_SETTINGS: RadiusSettings = {
  min: 150,
  max: 5000,
  step: 150,
  initial: 150,
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
