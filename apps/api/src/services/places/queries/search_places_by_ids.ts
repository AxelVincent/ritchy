import { logger } from '@ritchy/logger'
import type { FilterCondition, PlaceBase } from '@ritchy/types'
import { redisClient } from '../../../external/redis/redis'
import { ensurePlacesIndex } from '../helpers/ensure_places_index'
import { parseRediSearchFilter } from '../helpers/parse_redis_search_filter'
import { parseSearchResultsToPlaces } from '../helpers/parse_search_results_to_place'

type RedisSearchResults = (string | number | string[])[]

/**
 * Advanced search with filtering capabilities
 * @param placeIds - Array of place IDs to search for
 * @param filters - Filter conditions following the new filtering system
 * @returns Array of PlaceBase objects
 */
export const searchPlaces = async (
  placeIds: string[],
  filters?: FilterCondition
): Promise<PlaceBase[]> => {
  if (placeIds.length === 0) {
    return []
  }

  // Ensure index exists before searching
  await ensurePlacesIndex()

  try {
    // Escape special characters for RediSearch TAG queries
    const escapedIds = placeIds.map((id) =>
      id.replace(/-/g, '\\-').replace(/_/g, '\\_')
    )
    let searchQuery = `@id:{${escapedIds.join('|')}}`

    // Add filters if they exist
    if (filters) {
      const filterQuery = parseRediSearchFilter(filters)
      if (filterQuery) {
        searchQuery += ` ${filterQuery}`
      }
    }

    logger.debug({
      msg: 'Executing Redis search',
      event: 'redis_search_execute',
      metadata: {
        query: searchQuery,
        offset: 0,
        limit: 100,
        sort: []
      }
    })

    // Use FT.SEARCH to find all matching places
    const results = (await redisClient.redis.call(
      'FT.SEARCH',
      'places_idx',
      searchQuery,
      'LIMIT',
      '0',
      100
    )) as RedisSearchResults

    const places = parseSearchResultsToPlaces(results)

    logger.info({
      msg: 'Filtered RediSearch completed',
      event: 'places_filtered_search_success',
      metadata: {
        requestedIds: placeIds.length,
        foundResults: results[0] || 0,
        parsedPlaces: places.length,
        filters,
        searchQuery
      }
    })

    return places
  } catch (error) {
    logger.error({
      msg: 'Filtered RediSearch failed',
      event: 'places_filtered_search_error',
      metadata: { error, filters, placeCount: placeIds.length }
    })

    throw error
  }
}
