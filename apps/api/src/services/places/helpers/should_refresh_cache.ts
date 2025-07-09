import { logger } from '@ritchy/logger'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../../db/db'
import { listPlace, search } from '../../../db/schema'
import { countPlacesBySearchId } from '../../lists/queries/count_places_by_search_id'
import { getSearchBySearchId } from '../../search/queries/get_search_by_id'
import {
  SEARCH_FRESHNESS_THRESHOLD,
  type SearchRefreshDecision,
} from './cache_strategy'
import { computeCostEfficiency } from './compute_cost_efficiency'
import { getEstimatedApiCallsForModel } from './get_estimated_api_calls_for_model'

/**
 * Determine if a search should be refreshed based on staleness and cost efficiency
 */
export async function shouldRefreshSearch(
  searchId: string,
  missingPlaceCount: number,
): Promise<SearchRefreshDecision> {
  try {
    // Get search details
    const search = await getSearchBySearchId(searchId)

    if (!search) {
      return {
        shouldRefresh: false,
        reason: 'search_not_found',
        placeCount: 0,
        estimatedApiCalls: 0,
        individualCallsCost: 0,
        searchRefreshCost: 0,
      }
    }

    // Check if the search was recently refreshed
    const lastRefreshTime = search.updatedAt.getTime()
    const currentTime = Date.now()
    const isSearchStale =
      currentTime - lastRefreshTime > SEARCH_FRESHNESS_THRESHOLD

    if (!isSearchStale) {
      return {
        shouldRefresh: false,
        reason: 'recently_updated',
        placeCount: 0,
        estimatedApiCalls: 0,
        individualCallsCost: 0,
        searchRefreshCost: 0,
        timeSinceRefresh: `${Math.round((currentTime - lastRefreshTime) / 1000 / 60 / 60 / 24)} days`,
      }
    }

    // Get the estimated API calls for this search model
    const estimatedApiCalls = getEstimatedApiCallsForModel(search.model)

    // Count how many places in lists are associated with this search
    const placesFromSearch = await countPlacesBySearchId(searchId)

    const placeCount = Number(placesFromSearch.count || 0)

    // Calculate cost efficiency
    const { individualCallsCost, searchRefreshCost, isSearchMoreEfficient } =
      computeCostEfficiency(missingPlaceCount, estimatedApiCalls)

    // Determine if refresh is worthwhile
    const shouldRefresh =
      placeCount > estimatedApiCalls && isSearchMoreEfficient

    return {
      shouldRefresh,
      reason: shouldRefresh ? 'cost_effective' : 'not_cost_effective',
      placeCount,
      estimatedApiCalls,
      individualCallsCost,
      searchRefreshCost,
      timeSinceRefresh: `${Math.round((currentTime - lastRefreshTime) / 1000 / 60 / 60 / 24)} days`,
    }
  } catch (error) {
    logger.error({
      msg: 'Error determining search refresh decision',
      event: 'search_refresh_decision_error',
      metadata: {
        searchId,
        missingPlaceCount,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return {
      shouldRefresh: false,
      reason: 'search_not_found',
      placeCount: 0,
      estimatedApiCalls: 0,
      individualCallsCost: 0,
      searchRefreshCost: 0,
    }
  }
}
