import {
  bearing,
  center,
  featureCollection,
  point,
  polygon,
  transformScale,
} from '@turf/turf'
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

export const divideSquareIntoFour = (square: Square, ratio = 1): Square[] => {
  // Create points for the original square corners
  const nePt = point([square.northEast.longitude, square.northEast.latitude])
  const sePt = point([square.southEast.longitude, square.southEast.latitude])
  const swPt = point([square.southWest.longitude, square.southWest.latitude])
  const nwPt = point([square.northWest.longitude, square.northWest.latitude])

  // Calculate midpoints of each side
  const northMid = center(featureCollection([nePt, nwPt]))
  const eastMid = center(featureCollection([nePt, sePt]))
  const southMid = center(featureCollection([sePt, swPt]))
  const westMid = center(featureCollection([nwPt, swPt]))

  // Calculate center of the square
  const centerPt = center(featureCollection([nePt, sePt, swPt, nwPt]))

  // Helper function to convert Square corners to polygon coordinates
  const squareToPolygon = (square: Square) => {
    return polygon([
      [
        [square.northEast.longitude, square.northEast.latitude],
        [square.southEast.longitude, square.southEast.latitude],
        [square.southWest.longitude, square.southWest.latitude],
        [square.northWest.longitude, square.northWest.latitude],
        [square.northEast.longitude, square.northEast.latitude], // Close the ring
      ],
    ])
  }

  // Helper function to convert scaled polygon back to Square
  const polygonToSquare = (poly: GeoJSON.Feature<GeoJSON.Polygon>): Square => {
    const coords = poly.geometry.coordinates[0]
    return {
      northEast: { longitude: coords[0][0], latitude: coords[0][1] },
      southEast: { longitude: coords[1][0], latitude: coords[1][1] },
      southWest: { longitude: coords[2][0], latitude: coords[2][1] },
      northWest: { longitude: coords[3][0], latitude: coords[3][1] },
    }
  }

  const squares = [
    // Northeast square
    {
      northEast: square.northEast,
      southEast: {
        latitude: eastMid.geometry.coordinates[1],
        longitude: eastMid.geometry.coordinates[0],
      },
      southWest: {
        latitude: centerPt.geometry.coordinates[1],
        longitude: centerPt.geometry.coordinates[0],
      },
      northWest: {
        latitude: northMid.geometry.coordinates[1],
        longitude: northMid.geometry.coordinates[0],
      },
    },
    // Southeast square
    {
      northEast: {
        latitude: eastMid.geometry.coordinates[1],
        longitude: eastMid.geometry.coordinates[0],
      },
      southEast: square.southEast,
      southWest: {
        latitude: southMid.geometry.coordinates[1],
        longitude: southMid.geometry.coordinates[0],
      },
      northWest: {
        latitude: centerPt.geometry.coordinates[1],
        longitude: centerPt.geometry.coordinates[0],
      },
    },
    // Southwest square
    {
      northEast: {
        latitude: centerPt.geometry.coordinates[1],
        longitude: centerPt.geometry.coordinates[0],
      },
      southEast: {
        latitude: southMid.geometry.coordinates[1],
        longitude: southMid.geometry.coordinates[0],
      },
      southWest: square.southWest,
      northWest: {
        latitude: westMid.geometry.coordinates[1],
        longitude: westMid.geometry.coordinates[0],
      },
    },
    // Northwest square
    {
      northEast: {
        latitude: northMid.geometry.coordinates[1],
        longitude: northMid.geometry.coordinates[0],
      },
      southEast: {
        latitude: centerPt.geometry.coordinates[1],
        longitude: centerPt.geometry.coordinates[0],
      },
      southWest: {
        latitude: westMid.geometry.coordinates[1],
        longitude: westMid.geometry.coordinates[0],
      },
      northWest: square.northWest,
    },
  ]

  // Scale each square individually
  return squares.map((square) => {
    const poly = squareToPolygon(square)
    const scaled = transformScale(poly, ratio, { origin: 'center' })
    return polygonToSquare(scaled)
  })
}
