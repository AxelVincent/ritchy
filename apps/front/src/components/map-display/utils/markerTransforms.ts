import { getStatusColor } from '@/components/status/status-colors'
import type { StatusType, UserPlaceMarker } from '@ritchy/types'
import { MARKER_COLORS } from '../components/map_box/constants/markers'

interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number]
}

export interface MarkerFeatureProperties {
  id: string
  name: string
  color: string
}

export interface MarkerFeature {
  type: 'Feature'
  id: string
  geometry: GeoJSONPoint
  properties: MarkerFeatureProperties
}

export interface MarkerFeatureCollection {
  type: 'FeatureCollection'
  features: MarkerFeature[]
}

/**
 * Convert API markers to GeoJSON FeatureCollection
 * Markers are colored based on lead status
 */
export const markersToGeoJSON = (
  markers: UserPlaceMarker[],
): MarkerFeatureCollection => ({
  type: 'FeatureCollection',
  features: markers.map((marker) => ({
    type: 'Feature',
    id: marker.id,
    geometry: {
      type: 'Point',
      coordinates: [marker.location.longitude, marker.location.latitude],
    },
    properties: {
      id: marker.id,
      name: marker.name,
      color: marker.status
        ? getStatusColor(marker.status as StatusType, 'hex')
        : MARKER_COLORS.DEFAULT,
    },
  })),
})

/**
 * Create an empty GeoJSON FeatureCollection
 */
export const createEmptyFeatureCollection = (): MarkerFeatureCollection => ({
  type: 'FeatureCollection',
  features: [],
})
