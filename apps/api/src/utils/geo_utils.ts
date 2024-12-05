import logger from '@ritchy/logger'
import { point } from '@turf/turf'
import { destination } from '@turf/turf'

interface Coordinate {
  latitude: number
  longitude: number
}

export interface Square {
  northEast: Coordinate
  southEast: Coordinate
  southWest: Coordinate
  northWest: Coordinate
}

// TODO - Create a GeoJSON shared package
export const getLargestSquareFromCoordinates = (
  center: Coordinate,
  radiusInMeters: number,
): Square => {
  const centerPoint = point([center.longitude, center.latitude])
  const coordinates = [
    destination(centerPoint, radiusInMeters, 45, { units: 'meters' }).geometry
      .coordinates, // NW
    destination(centerPoint, radiusInMeters, 135, { units: 'meters' }).geometry
      .coordinates, // NE
    destination(centerPoint, radiusInMeters, 225, { units: 'meters' }).geometry
      .coordinates, // SE
    destination(centerPoint, radiusInMeters, 315, { units: 'meters' }).geometry
      .coordinates, // SW
    destination(centerPoint, radiusInMeters, 45, { units: 'meters' }).geometry
      .coordinates, // Back to NW to close the polygon
  ]

  const corners = {
    northEast: {
      latitude: coordinates[0][1],
      longitude: coordinates[0][0],
    },
    southEast: {
      latitude: coordinates[1][1],
      longitude: coordinates[1][0],
    },
    southWest: {
      latitude: coordinates[2][1],
      longitude: coordinates[2][0],
    },
    northWest: {
      latitude: coordinates[3][1],
      longitude: coordinates[3][0],
    },
  }

  return corners
}
