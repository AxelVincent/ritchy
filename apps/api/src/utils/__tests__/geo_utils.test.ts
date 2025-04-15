import { center, featureCollection, point } from '@turf/turf'
import { describe, expect, it } from 'vitest'
import {
  type Square,
  divideSquareIntoFour,
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

  describe('divideSquareIntoFour', () => {
    it('should divide a square into four equal squares', () => {
      const originalSquare: Square = {
        northEast: { latitude: 41, longitude: -74 },
        southEast: { latitude: 40, longitude: -74 },
        southWest: { latitude: 40, longitude: -75 },
        northWest: { latitude: 41, longitude: -75 },
      }

      const result = divideSquareIntoFour(originalSquare)

      // Check if we get 4 squares
      expect(result).toHaveLength(4)

      // Check if each resulting square has the correct properties
      for (const square of result) {
        expect(square).toHaveProperty('northEast')
        expect(square).toHaveProperty('southEast')
        expect(square).toHaveProperty('southWest')
        expect(square).toHaveProperty('northWest')

        // Check if coordinates are numbers and within the bounds of the original square
        for (const corner of Object.values(square)) {
          expect(typeof corner.latitude).toBe('number')
          expect(typeof corner.longitude).toBe('number')
          expect(corner.latitude).toBeGreaterThanOrEqual(
            originalSquare.southWest.latitude,
          )
          expect(corner.latitude).toBeLessThanOrEqual(
            originalSquare.northEast.latitude,
          )
          expect(corner.longitude).toBeGreaterThanOrEqual(
            originalSquare.northWest.longitude,
          )
          expect(corner.longitude).toBeLessThanOrEqual(
            originalSquare.northEast.longitude,
          )
        }
      }

      // Test that squares don't overlap by checking their centers are different using Turf
      const getCenterPoint = (square: Square) => {
        const points = [
          point([square.northEast.longitude, square.northEast.latitude]),
          point([square.southEast.longitude, square.southEast.latitude]),
          point([square.southWest.longitude, square.southWest.latitude]),
          point([square.northWest.longitude, square.northWest.latitude]),
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
  })
})
