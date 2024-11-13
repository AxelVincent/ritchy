import * as turf from '@turf/turf'

interface Coordinate {
  latitude: number
  longitude: number
}

interface Square {
  northEast: Coordinate
  southEast: Coordinate
  southWest: Coordinate
  northWest: Coordinate
}

export const getLargestSquareInCircle = (
  center: Coordinate,
  radiusInMeters: number
): Square => {
  const centerPoint = turf.point([center.longitude, center.latitude])

  // Calculate the side length of the largest square that fits in the circle
  // (diameter / √2)
  const squareSideLength = (2 * radiusInMeters) / Math.sqrt(2)
  const squareSideRadians = turf.lengthToRadians(squareSideLength, 'meters')

  // Calculate corners using bearings (45° intervals starting from NE)
  const corners = [45, 135, 225, 315].map((bearing) =>
    turf.destination(centerPoint, squareSideRadians, bearing, {
      units: 'radians'
    })
  )

  return {
    northEast: {
      latitude: corners[0].geometry.coordinates[1],
      longitude: corners[0].geometry.coordinates[0]
    },
    southEast: {
      latitude: corners[1].geometry.coordinates[1],
      longitude: corners[1].geometry.coordinates[0]
    },
    southWest: {
      latitude: corners[2].geometry.coordinates[1],
      longitude: corners[2].geometry.coordinates[0]
    },
    northWest: {
      latitude: corners[3].geometry.coordinates[1],
      longitude: corners[3].geometry.coordinates[0]
    }
  }
}
