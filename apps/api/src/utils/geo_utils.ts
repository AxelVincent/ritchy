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

export const divideRectangleIntoFour = (rect: Square, ratio = 1): Square[] => {
  // Create points for the original rectangle corners
  const nePt = point([rect.northEast.longitude, rect.northEast.latitude])
  const sePt = point([rect.southEast.longitude, rect.southEast.latitude])
  const swPt = point([rect.southWest.longitude, rect.southWest.latitude])
  const nwPt = point([rect.northWest.longitude, rect.northWest.latitude])

  // Calculate distances for width and height
  const width = nePt.geometry.coordinates[0] - nwPt.geometry.coordinates[0]
  const height = nwPt.geometry.coordinates[1] - swPt.geometry.coordinates[1]

  const widthQuarter = width / 2
  const heightQuarter = height / 2

  // Create the four rectangles (NW, NE, SW, SE)
  const quarters = [
    // Northwest quarter
    {
      northWest: {
        longitude: nwPt.geometry.coordinates[0],
        latitude: nwPt.geometry.coordinates[1],
      },
      northEast: {
        longitude: nwPt.geometry.coordinates[0] + widthQuarter,
        latitude: nwPt.geometry.coordinates[1],
      },
      southWest: {
        longitude: nwPt.geometry.coordinates[0],
        latitude: nwPt.geometry.coordinates[1] - heightQuarter,
      },
      southEast: {
        longitude: nwPt.geometry.coordinates[0] + widthQuarter,
        latitude: nwPt.geometry.coordinates[1] - heightQuarter,
      },
    },
    // Northeast quarter
    {
      northWest: {
        longitude: nwPt.geometry.coordinates[0] + widthQuarter,
        latitude: nwPt.geometry.coordinates[1],
      },
      northEast: {
        longitude: nePt.geometry.coordinates[0],
        latitude: nePt.geometry.coordinates[1],
      },
      southWest: {
        longitude: nwPt.geometry.coordinates[0] + widthQuarter,
        latitude: nwPt.geometry.coordinates[1] - heightQuarter,
      },
      southEast: {
        longitude: nePt.geometry.coordinates[0],
        latitude: nePt.geometry.coordinates[1] - heightQuarter,
      },
    },
    // Southwest quarter
    {
      northWest: {
        longitude: swPt.geometry.coordinates[0],
        latitude: swPt.geometry.coordinates[1] + heightQuarter,
      },
      northEast: {
        longitude: swPt.geometry.coordinates[0] + widthQuarter,
        latitude: swPt.geometry.coordinates[1] + heightQuarter,
      },
      southWest: {
        longitude: swPt.geometry.coordinates[0],
        latitude: swPt.geometry.coordinates[1],
      },
      southEast: {
        longitude: swPt.geometry.coordinates[0] + widthQuarter,
        latitude: swPt.geometry.coordinates[1],
      },
    },
    // Southeast quarter
    {
      northWest: {
        longitude: swPt.geometry.coordinates[0] + widthQuarter,
        latitude: swPt.geometry.coordinates[1] + heightQuarter,
      },
      northEast: {
        longitude: sePt.geometry.coordinates[0],
        latitude: sePt.geometry.coordinates[1] + heightQuarter,
      },
      southWest: {
        longitude: swPt.geometry.coordinates[0] + widthQuarter,
        latitude: swPt.geometry.coordinates[1],
      },
      southEast: {
        longitude: sePt.geometry.coordinates[0],
        latitude: sePt.geometry.coordinates[1],
      },
    },
  ]

  // If ratio is 1, return the quarters as is
  if (ratio === 1) {
    return quarters
  }

  // Helper function to convert rectangle to polygon for scaling
  const rectangleToPolygon = (rect: Square) => {
    return polygon([
      [
        [rect.northEast.longitude, rect.northEast.latitude],
        [rect.southEast.longitude, rect.southEast.latitude],
        [rect.southWest.longitude, rect.southWest.latitude],
        [rect.northWest.longitude, rect.northWest.latitude],
        [rect.northEast.longitude, rect.northEast.latitude], // Close the ring
      ],
    ])
  }

  // Helper function to convert polygon back to rectangle
  const polygonToRectangle = (
    poly: GeoJSON.Feature<GeoJSON.Polygon>,
  ): Square => {
    const coords = poly.geometry.coordinates[0]
    return {
      northEast: { longitude: coords[0][0], latitude: coords[0][1] },
      southEast: { longitude: coords[1][0], latitude: coords[1][1] },
      southWest: { longitude: coords[2][0], latitude: coords[2][1] },
      northWest: { longitude: coords[3][0], latitude: coords[3][1] },
    }
  }

  // Scale each rectangle if ratio is not 1
  return quarters.map((quarter) => {
    const poly = rectangleToPolygon(quarter)
    const scaled = transformScale(poly, ratio, { origin: 'center' })
    return polygonToRectangle(scaled)
  })
}
