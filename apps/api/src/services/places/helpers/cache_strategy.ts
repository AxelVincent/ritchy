import { logger } from '@ritchy/logger'
import type { PlaceBase, PlacesSearchRequestBody } from '@ritchy/types'
import { type InferSelectModel, eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { search } from '../../../db/schema'
import { postTextSearchV1 } from '../../../external/google_maps/text_search_V1'
import { redisClient } from '../../../external/redis/redis'
import { getSearchBySearchId } from '../../search/queries/get_search_by_id'
import { updateSearchById } from '../../search/queries/update_search_by_id'
import { COST_PER_TEXT_SEARCH_CALL } from './compute_cost_efficiency'
import { groupPlacesBySearch } from './group_places_by_search'
import { shouldRefreshSearch } from './should_refresh_cache'

// How recently a search should have been refreshed to be considered "fresh" (in milliseconds)
// 1 day = 24 * 60 * 60 * 1000 = 86,400,000 ms
export const SEARCH_FRESHNESS_THRESHOLD = 86_400_000 // 1 day

// Track which searches are currently being refreshed
const activeSearchRefreshes = new Map<string, Promise<PlaceBase[]>>()

// Types
export interface PlaceWithSearchId {
  placeId: string
  searchId: string | null
}

export interface SearchRefreshDecision {
  shouldRefresh: boolean
  reason:
    | 'cost_effective'
    | 'not_cost_effective'
    | 'recently_updated'
    | 'no_places'
    | 'search_not_found'
  placeCount: number
  estimatedApiCalls: number
  individualCallsCost: number
  searchRefreshCost: number
  timeSinceRefresh?: string
}

export interface CacheStrategyResult {
  totalSearchRefreshes: number
  placesRetrievedFromSearchRefresh: number
  updatedMissingPlaceIds: string[]
}

/**
 * Execute a search refresh with deduplication to avoid concurrent refreshes
 */
async function executeSearchRefresh(
  searchId: string,
  decision: SearchRefreshDecision,
  context: 'batch' | 'single' = 'batch',
): Promise<PlaceBase[]> {
  const search = await getSearchBySearchId(searchId)

  if (!search) {
    return []
  }

  // Check if this search is already being refreshed by another request
  const existingRefresh = activeSearchRefreshes.get(searchId)

  if (existingRefresh) {
    logger.info({
      msg: `Using already in-progress search refresh for ${context}`,
      event: `reuse_search_refresh_${context}`,
      metadata: {
        searchId,
        model: search.model,
      },
    })

    // Wait for the existing refresh to complete
    return await existingRefresh
  }

  // Start a new refresh and track it
  logger.info({
    msg: `Refreshing stale search results for ${context} optimization`,
    event: `refresh_search_for_${context}`,
    metadata: {
      searchId,
      model: search.model,
      lastRefreshTime: search.updatedAt.toISOString(),
      timeSinceRefresh: decision.timeSinceRefresh,
      placeCount: decision.placeCount,
      estimatedApiCalls: decision.estimatedApiCalls,
      costEfficiency:
        decision.placeCount > 0
          ? (decision.placeCount / decision.estimatedApiCalls).toFixed(2)
          : '0',
      individualCallsCost: decision.individualCallsCost,
      searchRefreshCost: decision.searchRefreshCost,
      potentialSavings: (
        decision.individualCallsCost - decision.searchRefreshCost
      ).toFixed(2),
    },
  })

  // Create search request
  const searchRequestBody: PlacesSearchRequestBody = {
    textQuery: search.keyword,
    rectangle: search.rectangle,
    model: search.model,
  }

  // Store the refresh promise
  const refreshPromise = (async () => {
    try {
      // Execute the search and cache the results
      const results = await postTextSearchV1(searchRequestBody)

      // Update the search timestamp
      await updateSearchById(searchId, { updatedAt: new Date() })

      logger.info({
        msg: `Search refresh completed for ${context} - BILLABLE API CALL OVERVIEW`,
        event: `search_refresh_completed_${context}`,
        metadata: {
          searchId,
          model: search.model,
          estimatedApiCalls: decision.estimatedApiCalls,
          estimatedCost: decision.estimatedApiCalls * COST_PER_TEXT_SEARCH_CALL,
          potentialCostSavings: Math.max(
            0,
            decision.individualCallsCost - decision.searchRefreshCost,
          ),
        },
      })

      return results
    } finally {
      // Remove from active refreshes when done
      activeSearchRefreshes.delete(searchId)
    }
  })()

  // Store the promise
  activeSearchRefreshes.set(searchId, refreshPromise)

  // Wait for the refresh to complete
  return await refreshPromise
}

/**
 * Process batch cache strategy with search refresh optimization
 */
export async function processBatchCacheStrategy(
  missingPlaceIds: string[],
  searchIdMap: Map<string, string | null>,
): Promise<CacheStrategyResult> {
  let totalSearchRefreshes = 0
  let placesRetrievedFromSearchRefresh = 0

  if (missingPlaceIds.length === 0) {
    return {
      totalSearchRefreshes,
      placesRetrievedFromSearchRefresh,
      updatedMissingPlaceIds: missingPlaceIds,
    }
  }

  // Group missing places by their search ID
  const { missingPlacesBySearch, missingPlacesWithoutSearch } =
    groupPlacesBySearch(missingPlaceIds, searchIdMap)

  logger.info({
    msg: 'Grouped missing places by search ID',
    event: 'batch_group_by_search',
    metadata: {
      totalMissing: missingPlaceIds.length,
      searchGroups: missingPlacesBySearch.size,
      placesWithoutSearch: missingPlacesWithoutSearch.length,
    },
  })

  // Process each search group for potential refresh optimization
  for (const [searchId, searchPlaceIds] of missingPlacesBySearch) {
    try {
      // Get search decision
      const decision = await shouldRefreshSearch(
        searchId,
        searchPlaceIds.length,
      )

      if (decision.shouldRefresh) {
        if (searchId) {
          await executeSearchRefresh(searchId, decision, 'batch')
          totalSearchRefreshes += 1
        }
      } else {
        // Log reason for skipping refresh
        const eventName =
          decision.reason === 'recently_updated'
            ? 'skip_search_refresh_batch_recent'
            : 'skip_search_refresh_batch_cost'

        logger.info({
          msg: `Skipping search refresh - ${decision.reason}`,
          event: eventName,
          metadata: {
            searchId,
            missingPlaces: searchPlaceIds.length,
            reason: decision.reason,
            timeSinceRefresh: decision.timeSinceRefresh,
            placeCount: decision.placeCount,
            estimatedApiCalls: decision.estimatedApiCalls,
            costEfficiency:
              decision.placeCount > 0
                ? (decision.placeCount / decision.estimatedApiCalls).toFixed(2)
                : '0',
            individualCallsCost: decision.individualCallsCost,
            searchRefreshCost: decision.searchRefreshCost,
          },
        })
      }
    } catch (error) {
      logger.error({
        msg: 'Error processing search refresh for batch',
        event: 'search_refresh_error_batch',
        metadata: {
          searchId,
          missingPlaces: searchPlaceIds.length,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }

  // Re-check which places are still missing after all search refreshes
  let updatedMissingPlaceIds = missingPlaceIds

  if (totalSearchRefreshes > 0) {
    const updatedExistenceMap =
      await redisClient.checkPlaceKeysExistence(missingPlaceIds)
    const originalMissingCount = missingPlaceIds.length
    updatedMissingPlaceIds = missingPlaceIds.filter(
      (id) => !updatedExistenceMap[id],
    )
    placesRetrievedFromSearchRefresh =
      originalMissingCount - updatedMissingPlaceIds.length

    logger.info({
      msg: 'Re-checked missing places after search refreshes',
      event: 'batch_recheck_after_search_refreshes',
      metadata: {
        originalMissing: originalMissingCount,
        stillMissing: updatedMissingPlaceIds.length,
        foundInSearchRefreshes: placesRetrievedFromSearchRefresh,
        searchRefreshesPerformed: totalSearchRefreshes,
      },
    })
  }

  return {
    totalSearchRefreshes,
    placesRetrievedFromSearchRefresh,
    updatedMissingPlaceIds,
  }
}
