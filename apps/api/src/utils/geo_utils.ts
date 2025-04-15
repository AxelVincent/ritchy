import type { Coordinate, Rectangle } from '@ritchy/types'
import { point, polygon, transformScale } from '@turf/turf'
import { destination } from '@turf/turf'

export const getLargestSquareFromCoordinates = (
  center: Coordinate,
  radiusInMeters: number,
): Rectangle => {
  const centerPoint = point([center.longitude, center.latitude])
  const coordinates = [
    destination(centerPoint, radiusInMeters, 45, { units: 'meters' }).geometry
      .coordinates, // NE
    destination(centerPoint, radiusInMeters, 225, { units: 'meters' }).geometry
      .coordinates, // SW
  ]

  const corners: Rectangle = {
    northEast: {
      latitude: coordinates[0][1],
      longitude: coordinates[0][0],
    },
    southWest: {
      latitude: coordinates[1][1],
      longitude: coordinates[1][0],
    },
  }

  return corners
}

export const divideRectangleIntoFour = (
  rect: Rectangle,
  ratio = 1,
): Rectangle[] => {
  // Create points for the original rectangle corners
  const nePt = point([rect.northEast.longitude, rect.northEast.latitude])
  const swPt = point([rect.southWest.longitude, rect.southWest.latitude])

  // Calculate distances for width and height
  const width = nePt.geometry.coordinates[0] - swPt.geometry.coordinates[0]
  const height = nePt.geometry.coordinates[1] - swPt.geometry.coordinates[1]

  const widthQuarter = width / 2
  const heightQuarter = height / 2

  // Create the four rectangles (NW, NE, SW, SE)
  const quarters = [
    // Northwest quarter
    {
      northEast: {
        longitude: swPt.geometry.coordinates[0] + widthQuarter,
        latitude: nePt.geometry.coordinates[1],
      },
      southWest: {
        longitude: swPt.geometry.coordinates[0],
        latitude: swPt.geometry.coordinates[1] + heightQuarter,
      },
    },
    // Northeast quarter
    {
      northEast: {
        longitude: nePt.geometry.coordinates[0],
        latitude: nePt.geometry.coordinates[1],
      },
      southWest: {
        longitude: swPt.geometry.coordinates[0] + widthQuarter,
        latitude: swPt.geometry.coordinates[1] + heightQuarter,
      },
    },
    // Southwest quarter
    {
      northEast: {
        longitude: swPt.geometry.coordinates[0] + widthQuarter,
        latitude: swPt.geometry.coordinates[1] + heightQuarter,
      },
      southWest: {
        longitude: swPt.geometry.coordinates[0],
        latitude: swPt.geometry.coordinates[1],
      },
    },
    // Southeast quarter
    {
      northEast: {
        longitude: nePt.geometry.coordinates[0],
        latitude: swPt.geometry.coordinates[1] + heightQuarter,
      },
      southWest: {
        longitude: swPt.geometry.coordinates[0] + widthQuarter,
        latitude: swPt.geometry.coordinates[1],
      },
    },
  ]

  // If ratio is 1, return the quarters as is
  if (ratio === 1) {
    return quarters
  }

  // Helper function to convert rectangle to polygon for scaling
  const rectangleToPolygon = (rect: Rectangle) => {
    return polygon([
      [
        [rect.northEast.longitude, rect.northEast.latitude],
        [rect.northEast.longitude, rect.southWest.latitude],
        [rect.southWest.longitude, rect.southWest.latitude],
        [rect.southWest.longitude, rect.northEast.latitude],
        [rect.northEast.longitude, rect.northEast.latitude], // Close the ring
      ],
    ])
  }

  // Helper function to convert polygon back to rectangle
  const polygonToRectangle = (
    poly: GeoJSON.Feature<GeoJSON.Polygon>,
  ): Rectangle => {
    const coords = poly.geometry.coordinates[0]
    return {
      northEast: { longitude: coords[0][0], latitude: coords[0][1] },
      southWest: { longitude: coords[2][0], latitude: coords[2][1] },
    }
  }

  // Scale each rectangle if ratio is not 1
  return quarters.map((quarter) => {
    const poly = rectangleToPolygon(quarter)
    const scaled = transformScale(poly, ratio, { origin: 'center' })
    return polygonToRectangle(scaled)
  })
}
