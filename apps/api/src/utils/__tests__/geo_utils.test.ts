import { center, featureCollection, point } from '@turf/turf'
import { describe, expect, it } from 'vitest'
import {
  type Square,
  divideRectangleIntoFour,
  getLargestSquareFromCoordinates,
} from '../geo_utils'

describe('geo_utils', () => {
  describe('getLargestSquareFromCoordinates', () => {
    it('should create a square with correct coordinates', () => {
      // New York City coordinates
      const center = {
        latitude: 40.7128,
        longitude: -74.006,
      }
      const radiusInMeters = 1000

      const result = getLargestSquareFromCoordinates(center, radiusInMeters)

      // Check if all corners are present
      expect(result).toHaveProperty('northEast')
      expect(result).toHaveProperty('southEast')
      expect(result).toHaveProperty('southWest')
      expect(result).toHaveProperty('northWest')

      // Check if coordinates are numbers and within reasonable bounds
      for (const corner of Object.values(result)) {
        expect(typeof corner.latitude).toBe('number')
        expect(typeof corner.longitude).toBe('number')
        expect(corner.latitude).toBeGreaterThan(center.latitude - 0.1)
        expect(corner.latitude).toBeLessThan(center.latitude + 0.1)
        expect(corner.longitude).toBeGreaterThan(center.longitude - 0.1)
        expect(corner.longitude).toBeLessThan(center.longitude + 0.1)
      }
    })
  })

  describe('divideRectangleIntoFour', () => {
    it('should divide a rectangle into four equal rectangles', () => {
      const originalRectangle: Square = {
        northEast: { latitude: 41, longitude: -74 },
        southEast: { latitude: 40, longitude: -74 },
        southWest: { latitude: 40, longitude: -76 }, // Note: wider than the square test
        northWest: { latitude: 41, longitude: -76 },
      }

      const result = divideRectangleIntoFour(originalRectangle)

      // Check if we get 4 rectangles
      expect(result).toHaveLength(4)

      // Check if each resulting rectangle has the correct properties
      for (const rectangle of result) {
        expect(rectangle).toHaveProperty('northEast')
        expect(rectangle).toHaveProperty('southEast')
        expect(rectangle).toHaveProperty('southWest')
        expect(rectangle).toHaveProperty('northWest')

        // Check if coordinates are numbers and within the bounds of the original rectangle
        for (const corner of Object.values(rectangle)) {
          expect(typeof corner.latitude).toBe('number')
          expect(typeof corner.longitude).toBe('number')
          expect(corner.latitude).toBeGreaterThanOrEqual(
            originalRectangle.southWest.latitude,
          )
          expect(corner.latitude).toBeLessThanOrEqual(
            originalRectangle.northEast.latitude,
          )
          expect(corner.longitude).toBeGreaterThanOrEqual(
            originalRectangle.northWest.longitude,
          )
          expect(corner.longitude).toBeLessThanOrEqual(
            originalRectangle.northEast.longitude,
          )
        }
      }

      // Test that rectangles maintain proper width/height ratio
      const getWidthAndHeight = (rect: Square) => {
        const width = Math.abs(
          rect.northEast.longitude - rect.northWest.longitude,
        )
        const height = Math.abs(
          rect.northEast.latitude - rect.southEast.latitude,
        )
        return { width, height }
      }

      const originalDimensions = getWidthAndHeight(originalRectangle)
      const expectedQuarterWidth = originalDimensions.width / 2
      const expectedQuarterHeight = originalDimensions.height / 2

      for (const rect of result) {
        const dimensions = getWidthAndHeight(rect)
        expect(dimensions.width).toBeCloseTo(expectedQuarterWidth, 6)
        expect(dimensions.height).toBeCloseTo(expectedQuarterHeight, 6)
      }

      // Test that rectangles don't overlap by checking their centers are different
      const getCenterPoint = (rect: Square) => {
        const points = [
          point([rect.northEast.longitude, rect.northEast.latitude]),
          point([rect.southEast.longitude, rect.southEast.latitude]),
          point([rect.southWest.longitude, rect.southWest.latitude]),
          point([rect.northWest.longitude, rect.northWest.latitude]),
        ]
        const centerPoint = center(featureCollection(points))
        return {
          latitude: centerPoint.geometry.coordinates[1],
          longitude: centerPoint.geometry.coordinates[0],
        }
      }

      const centers = result.map(getCenterPoint)
      const uniqueCenters = new Set(
        centers.map(
          (c) => `${c.latitude.toFixed(6)},${c.longitude.toFixed(6)}`,
        ),
      )
      expect(uniqueCenters.size).toBe(4)
    })

    it('should properly scale rectangles when ratio is provided', () => {
      const originalRectangle: Square = {
        northEast: { latitude: 41, longitude: -74 },
        southEast: { latitude: 40, longitude: -74 },
        southWest: { latitude: 40, longitude: -76 },
        northWest: { latitude: 41, longitude: -76 },
      }

      const ratio = 0.9
      const result = divideRectangleIntoFour(originalRectangle, ratio)

      // Check if scaled rectangles are smaller than unscaled ones
      const unscaledRectangles = divideRectangleIntoFour(originalRectangle)

      result.forEach((scaledRect, index) => {
        const unscaledRect = unscaledRectangles[index]
        const scaledWidth = Math.abs(
          scaledRect.northEast.longitude - scaledRect.northWest.longitude,
        )
        const unscaledWidth = Math.abs(
          unscaledRect.northEast.longitude - unscaledRect.northWest.longitude,
        )
        expect(scaledWidth).toBeLessThan(unscaledWidth)
      })
    })

    it('should reconstruct the original rectangle when combining all quarters', () => {
      const originalRectangle: Square = {
        northEast: { latitude: 41, longitude: -74 },
        southEast: { latitude: 40, longitude: -74 },
        southWest: { latitude: 40, longitude: -76 },
        northWest: { latitude: 41, longitude: -76 },
      }

      const quarters = divideRectangleIntoFour(originalRectangle)

      // Check north edge reconstruction
      expect(quarters[0].northWest.latitude).toBe(
        originalRectangle.northWest.latitude,
      )
      expect(quarters[0].northWest.longitude).toBe(
        originalRectangle.northWest.longitude,
      )
      expect(quarters[1].northEast.latitude).toBe(
        originalRectangle.northEast.latitude,
      )
      expect(quarters[1].northEast.longitude).toBe(
        originalRectangle.northEast.longitude,
      )

      // Check south edge reconstruction
      expect(quarters[2].southWest.latitude).toBe(
        originalRectangle.southWest.latitude,
      )
      expect(quarters[2].southWest.longitude).toBe(
        originalRectangle.southWest.longitude,
      )
      expect(quarters[3].southEast.latitude).toBe(
        originalRectangle.southEast.latitude,
      )
      expect(quarters[3].southEast.longitude).toBe(
        originalRectangle.southEast.longitude,
      )

      // Check that quarters share exact coordinates at their meeting points
      // Center point check
      expect(quarters[0].southEast).toEqual(quarters[1].southWest)
      expect(quarters[2].northEast).toEqual(quarters[3].northWest)
      expect(quarters[0].southWest).toEqual(quarters[2].northWest)
      expect(quarters[1].southEast).toEqual(quarters[3].northEast)

      // Middle edge points check
      expect(quarters[0].northEast.latitude).toBe(
        quarters[1].northWest.latitude,
      )
      expect(quarters[0].northEast.longitude).toBe(
        quarters[1].northWest.longitude,
      )
      expect(quarters[2].southEast.latitude).toBe(
        quarters[3].southWest.latitude,
      )
      expect(quarters[2].southEast.longitude).toBe(
        quarters[3].southWest.longitude,
      )
    })
  })
})
