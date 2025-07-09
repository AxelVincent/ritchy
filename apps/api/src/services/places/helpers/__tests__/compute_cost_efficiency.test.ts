import { describe, expect, it } from 'vitest'
import {
  COST_PER_PLACE_DETAILS_CALL,
  COST_PER_TEXT_SEARCH_CALL,
  computeCostEfficiency,
} from '../compute_cost_efficiency'

describe('computeCostEfficiency', () => {
  describe('basic functionality', () => {
    it('should calculate costs correctly when search is more efficient', () => {
      const missingPlaceCount = 10
      const estimatedApiCalls = 2

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.individualCallsCost).toBe(10 * COST_PER_PLACE_DETAILS_CALL) // 0.40
      expect(result.searchRefreshCost).toBe(2 * COST_PER_TEXT_SEARCH_CALL) // 0.08
      expect(result.isSearchMoreEfficient).toBe(true)
    })

    it('should calculate costs correctly when individual calls are more efficient', () => {
      const missingPlaceCount = 2
      const estimatedApiCalls = 10

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.individualCallsCost).toBe(2 * COST_PER_PLACE_DETAILS_CALL) // 0.08
      expect(result.searchRefreshCost).toBe(10 * COST_PER_TEXT_SEARCH_CALL) // 0.40
      expect(result.isSearchMoreEfficient).toBe(false)
    })

    it('should handle equal costs correctly', () => {
      const missingPlaceCount = 5
      const estimatedApiCalls = 5

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.individualCallsCost).toBe(5 * COST_PER_PLACE_DETAILS_CALL) // 0.20
      expect(result.searchRefreshCost).toBe(5 * COST_PER_TEXT_SEARCH_CALL) // 0.20
      expect(result.isSearchMoreEfficient).toBe(false) // false when equal (not strictly less than)
    })
  })

  describe('edge cases', () => {
    it('should handle zero missing places', () => {
      const missingPlaceCount = 0
      const estimatedApiCalls = 5

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.individualCallsCost).toBe(0)
      expect(result.searchRefreshCost).toBe(5 * COST_PER_TEXT_SEARCH_CALL) // 0.20
      expect(result.isSearchMoreEfficient).toBe(false)
    })

    it('should handle zero estimated API calls', () => {
      const missingPlaceCount = 5
      const estimatedApiCalls = 0

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.individualCallsCost).toBe(5 * COST_PER_PLACE_DETAILS_CALL) // 0.20
      expect(result.searchRefreshCost).toBe(0)
      expect(result.isSearchMoreEfficient).toBe(true)
    })

    it('should handle both values being zero', () => {
      const missingPlaceCount = 0
      const estimatedApiCalls = 0

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.individualCallsCost).toBe(0)
      expect(result.searchRefreshCost).toBe(0)
      expect(result.isSearchMoreEfficient).toBe(false) // 0 is not less than 0
    })

    it('should handle large numbers correctly', () => {
      const missingPlaceCount = 1000000
      const estimatedApiCalls = 500000

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.individualCallsCost).toBe(
        1000000 * COST_PER_PLACE_DETAILS_CALL,
      ) // 40000
      expect(result.searchRefreshCost).toBe(500000 * COST_PER_TEXT_SEARCH_CALL) // 20000
      expect(result.isSearchMoreEfficient).toBe(true)
    })

    it('should handle decimal places correctly', () => {
      const missingPlaceCount = 3
      const estimatedApiCalls = 7

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.individualCallsCost).toBe(0.12) // 3 * 0.04
      expect(result.searchRefreshCost).toBe(0.28) // 7 * 0.04
      expect(result.isSearchMoreEfficient).toBe(false)
    })
  })

  describe('boundary conditions', () => {
    it('should identify search as more efficient when costs are very close but search is cheaper', () => {
      // Using costs where search is just slightly cheaper
      const missingPlaceCount = 100
      const estimatedApiCalls = 99

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.individualCallsCost).toBe(4.0) // 100 * 0.04
      expect(result.searchRefreshCost).toBe(3.96) // 99 * 0.04
      expect(result.isSearchMoreEfficient).toBe(true)
    })

    it('should identify individual calls as more efficient when costs are very close but individual is cheaper', () => {
      // Using costs where individual calls are just slightly cheaper
      const missingPlaceCount = 99
      const estimatedApiCalls = 100

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.individualCallsCost).toBe(3.96) // 99 * 0.04
      expect(result.searchRefreshCost).toBe(4.0) // 100 * 0.04
      expect(result.isSearchMoreEfficient).toBe(false)
    })

    it('should handle single place vs single API call', () => {
      const missingPlaceCount = 1
      const estimatedApiCalls = 1

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.individualCallsCost).toBe(COST_PER_PLACE_DETAILS_CALL)
      expect(result.searchRefreshCost).toBe(COST_PER_TEXT_SEARCH_CALL)
      expect(result.isSearchMoreEfficient).toBe(false) // Equal costs, so false
    })
  })

  describe('cost constants validation', () => {
    it('should use the correct cost constants', () => {
      expect(COST_PER_PLACE_DETAILS_CALL).toBe(0.04)
      expect(COST_PER_TEXT_SEARCH_CALL).toBe(0.04)
    })

    it('should calculate costs using the exported constants', () => {
      const missingPlaceCount = 5
      const estimatedApiCalls = 3

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      // Verify calculations use the constants
      expect(result.individualCallsCost).toBe(
        missingPlaceCount * COST_PER_PLACE_DETAILS_CALL,
      )
      expect(result.searchRefreshCost).toBe(
        estimatedApiCalls * COST_PER_TEXT_SEARCH_CALL,
      )
    })
  })

  describe('return value structure', () => {
    it('should return the correct structure with all required properties', () => {
      const missingPlaceCount = 5
      const estimatedApiCalls = 3

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result).toHaveProperty('individualCallsCost')
      expect(result).toHaveProperty('searchRefreshCost')
      expect(result).toHaveProperty('isSearchMoreEfficient')

      expect(typeof result.individualCallsCost).toBe('number')
      expect(typeof result.searchRefreshCost).toBe('number')
      expect(typeof result.isSearchMoreEfficient).toBe('boolean')
    })

    it('should return positive numbers for costs when inputs are positive', () => {
      const missingPlaceCount = 5
      const estimatedApiCalls = 3

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.individualCallsCost).toBeGreaterThan(0)
      expect(result.searchRefreshCost).toBeGreaterThan(0)
    })

    it('should return zero costs when inputs are zero', () => {
      const result1 = computeCostEfficiency(0, 5)
      const result2 = computeCostEfficiency(5, 0)

      expect(result1.individualCallsCost).toBe(0)
      expect(result2.searchRefreshCost).toBe(0)
    })
  })

  describe('efficiency decision logic', () => {
    it('should prioritize search when significantly cheaper', () => {
      const missingPlaceCount = 100
      const estimatedApiCalls = 10

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.searchRefreshCost).toBeLessThan(result.individualCallsCost)
      expect(result.isSearchMoreEfficient).toBe(true)
    })

    it('should prioritize individual calls when significantly cheaper', () => {
      const missingPlaceCount = 10
      const estimatedApiCalls = 100

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.individualCallsCost).toBeLessThan(result.searchRefreshCost)
      expect(result.isSearchMoreEfficient).toBe(false)
    })

    it('should handle fractional differences correctly', () => {
      // Test case where the difference is less than a cent
      const missingPlaceCount = 25
      const estimatedApiCalls = 24

      const result = computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

      expect(result.individualCallsCost).toBe(1.0) // 25 * 0.04
      expect(result.searchRefreshCost).toBe(0.96) // 24 * 0.04
      expect(result.isSearchMoreEfficient).toBe(true)
    })
  })
})
