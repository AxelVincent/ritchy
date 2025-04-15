import type { Rectangle } from '@ritchy/types'
import { center, featureCollection, point } from '@turf/turf'
import { describe, expect, it } from 'vitest'
import {
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
      expect(result).toHaveProperty('southWest')

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
      const originalRectangle: Rectangle = {
        northEast: { latitude: 41, longitude: -74 },
        southWest: { latitude: 40, longitude: -76 },
      }

      const result = divideRectangleIntoFour(originalRectangle)

      // Check if we get 4 rectangles
      expect(result).toHaveLength(4)

      // Check if each resulting rectangle has the correct properties
      for (const rectangle of result) {
        expect(rectangle).toHaveProperty('northEast')
        expect(rectangle).toHaveProperty('southWest')

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
            originalRectangle.southWest.longitude,
          )
          expect(corner.longitude).toBeLessThanOrEqual(
            originalRectangle.northEast.longitude,
          )
        }
      }

      // Test that rectangles maintain proper width/height ratio
      const getWidthAndHeight = (rect: Rectangle) => {
        const width = Math.abs(
          rect.northEast.longitude - rect.southWest.longitude,
        )
        const height = Math.abs(
          rect.northEast.latitude - rect.southWest.latitude,
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
      const getCenterPoint = (rect: Rectangle) => {
        const points = [
          point([rect.northEast.longitude, rect.northEast.latitude]),
          point([rect.northEast.longitude, rect.southWest.latitude]),
          point([rect.southWest.longitude, rect.southWest.latitude]),
          point([rect.southWest.longitude, rect.northEast.latitude]),
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
      const originalRectangle: Rectangle = {
        northEast: { latitude: 41, longitude: -74 },
        southWest: { latitude: 40, longitude: -76 },
      }

      const ratio = 0.9
      const result = divideRectangleIntoFour(originalRectangle, ratio)

      // Check if scaled rectangles are smaller than unscaled ones
      const unscaledRectangles = divideRectangleIntoFour(originalRectangle)

      result.forEach((scaledRect, index) => {
        const unscaledRect = unscaledRectangles[index]
        const scaledWidth = Math.abs(
          scaledRect.northEast.longitude - scaledRect.southWest.longitude,
        )
        const unscaledWidth = Math.abs(
          unscaledRect.northEast.longitude - unscaledRect.southWest.longitude,
        )
        expect(scaledWidth).toBeLessThan(unscaledWidth)
      })
    })

    it('should reconstruct the original rectangle when combining all quarters', () => {
      const originalRectangle: Rectangle = {
        northEast: { latitude: 41, longitude: -74 },
        southWest: { latitude: 40, longitude: -76 },
      }

      const quarters = divideRectangleIntoFour(originalRectangle)

      // Check outer boundaries match original rectangle
      expect(quarters[1].northEast).toEqual(originalRectangle.northEast)
      expect(quarters[2].southWest).toEqual(originalRectangle.southWest)

      // Check that quarters share exact coordinates at their meeting points
      // Vertical middle line
      expect(quarters[0].northEast.longitude).toBe(
        quarters[1].southWest.longitude,
      )
      expect(quarters[2].northEast.longitude).toBe(
        quarters[3].southWest.longitude,
      )

      // Horizontal middle line
      expect(quarters[0].southWest.latitude).toBe(
        quarters[2].northEast.latitude,
      )
      expect(quarters[1].southWest.latitude).toBe(
        quarters[3].northEast.latitude,
      )

      // Center point
      const centerLat = quarters[0].southWest.latitude
      const centerLon = quarters[0].northEast.longitude
      expect(quarters[0].southWest.latitude).toBe(centerLat)
      expect(quarters[1].southWest.latitude).toBe(centerLat)
      expect(quarters[2].northEast.latitude).toBe(centerLat)
      expect(quarters[3].northEast.latitude).toBe(centerLat)
      expect(quarters[0].northEast.longitude).toBe(centerLon)
      expect(quarters[1].southWest.longitude).toBe(centerLon)
      expect(quarters[2].northEast.longitude).toBe(centerLon)
      expect(quarters[3].southWest.longitude).toBe(centerLon)
    })
  })
})
