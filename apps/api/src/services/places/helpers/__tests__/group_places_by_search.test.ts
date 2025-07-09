import { describe, expect, it } from 'vitest'
import { groupPlacesBySearch } from '../group_places_by_search'

describe('groupPlacesBySearch', () => {
  describe('basic functionality', () => {
    it('should group places by their search ID correctly', () => {
      const missingPlaceIds = ['place1', 'place2', 'place3', 'place4']
      const searchIdMap = new Map([
        ['place1', 'search1'],
        ['place2', 'search1'],
        ['place3', 'search2'],
        ['place4', 'search2'],
      ])

      const result = groupPlacesBySearch(missingPlaceIds, searchIdMap)

      expect(result.missingPlacesBySearch.size).toBe(2)
      expect(result.missingPlacesBySearch.get('search1')).toEqual([
        'place1',
        'place2',
      ])
      expect(result.missingPlacesBySearch.get('search2')).toEqual([
        'place3',
        'place4',
      ])
      expect(result.missingPlacesWithoutSearch).toEqual([])
    })

    it('should handle places without search IDs', () => {
      const missingPlaceIds = ['place1', 'place2', 'place3']
      const searchIdMap = new Map([
        ['place1', 'search1'],
        ['place2', null],
        // place3 is not in the map at all
      ])

      const result = groupPlacesBySearch(missingPlaceIds, searchIdMap)

      expect(result.missingPlacesBySearch.size).toBe(1)
      expect(result.missingPlacesBySearch.get('search1')).toEqual(['place1'])
      expect(result.missingPlacesWithoutSearch).toEqual(['place2', 'place3'])
    })

    it('should handle mixed scenarios with some places having search IDs and others not', () => {
      const missingPlaceIds = ['place1', 'place2', 'place3', 'place4', 'place5']
      const searchIdMap = new Map([
        ['place1', 'search1'],
        ['place2', 'search1'],
        ['place3', null],
        ['place4', 'search2'],
        // place5 is not in the map
      ])

      const result = groupPlacesBySearch(missingPlaceIds, searchIdMap)

      expect(result.missingPlacesBySearch.size).toBe(2)
      expect(result.missingPlacesBySearch.get('search1')).toEqual([
        'place1',
        'place2',
      ])
      expect(result.missingPlacesBySearch.get('search2')).toEqual(['place4'])
      expect(result.missingPlacesWithoutSearch).toEqual(['place3', 'place5'])
    })
  })

  describe('edge cases', () => {
    it('should handle empty missingPlaceIds array', () => {
      const missingPlaceIds: string[] = []
      const searchIdMap = new Map([
        ['place1', 'search1'],
        ['place2', 'search2'],
      ])

      const result = groupPlacesBySearch(missingPlaceIds, searchIdMap)

      expect(result.missingPlacesBySearch.size).toBe(0)
      expect(result.missingPlacesWithoutSearch).toEqual([])
    })

    it('should handle empty searchIdMap', () => {
      const missingPlaceIds = ['place1', 'place2', 'place3']
      const searchIdMap = new Map<string, string | null>()

      const result = groupPlacesBySearch(missingPlaceIds, searchIdMap)

      expect(result.missingPlacesBySearch.size).toBe(0)
      expect(result.missingPlacesWithoutSearch).toEqual([
        'place1',
        'place2',
        'place3',
      ])
    })

    it('should handle all places having null search IDs', () => {
      const missingPlaceIds = ['place1', 'place2', 'place3']
      const searchIdMap = new Map([
        ['place1', null],
        ['place2', null],
        ['place3', null],
      ])

      const result = groupPlacesBySearch(missingPlaceIds, searchIdMap)

      expect(result.missingPlacesBySearch.size).toBe(0)
      expect(result.missingPlacesWithoutSearch).toEqual([
        'place1',
        'place2',
        'place3',
      ])
    })

    it('should handle all places having valid search IDs', () => {
      const missingPlaceIds = ['place1', 'place2', 'place3', 'place4']
      const searchIdMap = new Map([
        ['place1', 'search1'],
        ['place2', 'search1'],
        ['place3', 'search2'],
        ['place4', 'search3'],
      ])

      const result = groupPlacesBySearch(missingPlaceIds, searchIdMap)

      expect(result.missingPlacesBySearch.size).toBe(3)
      expect(result.missingPlacesBySearch.get('search1')).toEqual([
        'place1',
        'place2',
      ])
      expect(result.missingPlacesBySearch.get('search2')).toEqual(['place3'])
      expect(result.missingPlacesBySearch.get('search3')).toEqual(['place4'])
      expect(result.missingPlacesWithoutSearch).toEqual([])
    })

    it('should handle single place with search ID', () => {
      const missingPlaceIds = ['place1']
      const searchIdMap = new Map([['place1', 'search1']])

      const result = groupPlacesBySearch(missingPlaceIds, searchIdMap)

      expect(result.missingPlacesBySearch.size).toBe(1)
      expect(result.missingPlacesBySearch.get('search1')).toEqual(['place1'])
      expect(result.missingPlacesWithoutSearch).toEqual([])
    })

    it('should handle single place without search ID', () => {
      const missingPlaceIds = ['place1']
      const searchIdMap = new Map([['place1', null]])

      const result = groupPlacesBySearch(missingPlaceIds, searchIdMap)

      expect(result.missingPlacesBySearch.size).toBe(0)
      expect(result.missingPlacesWithoutSearch).toEqual(['place1'])
    })

    it('should handle duplicate place IDs correctly', () => {
      const missingPlaceIds = ['place1', 'place1', 'place2']
      const searchIdMap = new Map([
        ['place1', 'search1'],
        ['place2', 'search2'],
      ])

      const result = groupPlacesBySearch(missingPlaceIds, searchIdMap)

      expect(result.missingPlacesBySearch.size).toBe(2)
      expect(result.missingPlacesBySearch.get('search1')).toEqual([
        'place1',
        'place1',
      ])
      expect(result.missingPlacesBySearch.get('search2')).toEqual(['place2'])
      expect(result.missingPlacesWithoutSearch).toEqual([])
    })
  })

  describe('return value structure', () => {
    it('should return the correct structure with both Map and array', () => {
      const missingPlaceIds = ['place1', 'place2']
      const searchIdMap = new Map([
        ['place1', 'search1'],
        ['place2', null],
      ])

      const result = groupPlacesBySearch(missingPlaceIds, searchIdMap)

      expect(result).toHaveProperty('missingPlacesBySearch')
      expect(result).toHaveProperty('missingPlacesWithoutSearch')
      expect(result.missingPlacesBySearch).toBeInstanceOf(Map)
      expect(Array.isArray(result.missingPlacesWithoutSearch)).toBe(true)
    })

    it('should maintain the original order of places in grouped results', () => {
      const missingPlaceIds = ['place3', 'place1', 'place4', 'place2']
      const searchIdMap = new Map([
        ['place1', 'search1'],
        ['place2', 'search1'],
        ['place3', 'search1'],
        ['place4', 'search1'],
      ])

      const result = groupPlacesBySearch(missingPlaceIds, searchIdMap)

      expect(result.missingPlacesBySearch.get('search1')).toEqual([
        'place3',
        'place1',
        'place4',
        'place2',
      ])
    })

    it('should maintain the original order of places without search IDs', () => {
      const missingPlaceIds = ['place3', 'place1', 'place4', 'place2']
      const searchIdMap = new Map([
        ['place1', null],
        ['place2', null],
        ['place3', null],
        ['place4', null],
      ])

      const result = groupPlacesBySearch(missingPlaceIds, searchIdMap)

      expect(result.missingPlacesWithoutSearch).toEqual([
        'place3',
        'place1',
        'place4',
        'place2',
      ])
    })
  })

  describe('large dataset handling', () => {
    it('should handle large numbers of places efficiently', () => {
      const missingPlaceIds = Array.from(
        { length: 1000 },
        (_, i) => `place${i}`,
      )
      const searchIdMap = new Map(
        missingPlaceIds.map((id, index) => [
          id,
          index % 10 === 0 ? null : `search${index % 5}`,
        ]),
      )

      const result = groupPlacesBySearch(missingPlaceIds, searchIdMap)

      // Should have 5 search groups (search0 through search4)
      expect(result.missingPlacesBySearch.size).toBe(5)

      // Should have 100 places without search (every 10th place)
      expect(result.missingPlacesWithoutSearch).toHaveLength(100)

      // Verify total count matches original
      const totalGroupedPlaces = Array.from(
        result.missingPlacesBySearch.values(),
      ).reduce((sum, places) => sum + places.length, 0)
      expect(
        totalGroupedPlaces + result.missingPlacesWithoutSearch.length,
      ).toBe(1000)
    })
  })
})
