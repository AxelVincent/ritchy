import { logger } from '@ritchy/logger'
import type { FilterCondition, PlaceBase } from '@ritchy/types'
import { getPlaceDetailsV1 } from '../../external/google_maps/place_details_V1'
import { redisClient } from '../../external/redis/redis'

import {
  type CacheStrategyResult,
  type PlaceWithSearchId,
  processBatchCacheStrategy
} from './helpers/cache_strategy'
import { COST_PER_PLACE_DETAILS_CALL } from './helpers/compute_cost_efficiency'
import { searchPlaces } from './queries/search_places_by_ids'

/**
 * Batch place details retrieval with search refresh optimization:
 * 1. Check key existence with Redis pipeline + EXISTS
 * 2. Group missing places by search ID and apply optimization strategy per search
 * 3. Call API to refresh remaining missing keys individually
 * 4. Get all keys with one Redis query
 * 5. Map the results
 */
export async function getPlaces(
  placesWithSearchIds: PlaceWithSearchId[],
  filters?: FilterCondition
): Promise<PlaceBase[]> {
  const startTime = Date.now()

  if (placesWithSearchIds.length === 0) {
    logger.info({
      msg: 'No places to retrieve',
      event: 'no_places_to_retrieve'
    })
    return []
  }

  const placeIds = placesWithSearchIds.map((p) => p.placeId)
  const searchIdMap = new Map(
    placesWithSearchIds.map(({ placeId, searchId }) => [placeId, searchId])
  )

  logger.info({
    msg: 'Starting batch place details retrieval with search optimization',
    event: 'batch_place_details_start',
    metadata: {
      totalPlaces: placeIds.length,
      uniqueSearches: new Set(
        placesWithSearchIds.map((p) => p.searchId).filter(Boolean)
      ).size
    }
  })

  // Step 1: Check key existence with Redis pipeline + EXISTS
  const existenceMap = await redisClient.checkPlaceKeysExistence(placeIds)
  let missingPlaceIds = placeIds.filter((id) => !existenceMap[id])

  logger.info({
    msg: 'Key existence check completed',
    event: 'batch_key_existence_complete',
    metadata: {
      total: placeIds.length,
      existing: Object.values(existenceMap).filter(Boolean).length,
      missing: missingPlaceIds.length,
      cacheHitRate: `${((Object.values(existenceMap).filter(Boolean).length / placeIds.length) * 100).toFixed(1)}%`
    }
  })

  // Step 2: Apply cache strategy with search refresh optimization
  const cacheStrategyResult: CacheStrategyResult =
    await processBatchCacheStrategy(missingPlaceIds, searchIdMap)

  // Update missing place IDs after cache strategy execution
  missingPlaceIds = cacheStrategyResult.updatedMissingPlaceIds

  // Step 3: Call API to refresh remaining missing keys individually
  let individualApiCalls = 0
  let individualApiErrors = 0

  if (missingPlaceIds.length > 0) {
    logger.info({
      msg: 'Refreshing remaining missing keys from API',
      event: 'batch_api_refresh_remaining',
      metadata: {
        missingPlaceIds: missingPlaceIds.length,
        estimatedCost: missingPlaceIds.length * COST_PER_PLACE_DETAILS_CALL
      }
    })

    const apiResults = await Promise.allSettled(
      missingPlaceIds.map((placeId) => getPlaceDetailsV1(placeId))
    )

    individualApiCalls = apiResults.length
    individualApiErrors = apiResults.filter(
      (result) => result.status === 'rejected'
    ).length

    logger.info({
      msg: 'Individual API refresh completed',
      event: 'batch_individual_api_refresh_complete',
      metadata: {
        totalCalls: individualApiCalls,
        successfulCalls: individualApiCalls - individualApiErrors,
        failedCalls: individualApiErrors
      }
    })
  }

  // Step 4: Get all keys with one Redis query
  const results = await searchPlaces(placeIds, filters)

  const endTime = Date.now()

  logger.info({
    msg: 'Batch place details retrieval completed with search optimization',
    event: 'batch_place_details_complete',
    metadata: {
      requestedPlaces: placeIds.length,
      initialCacheHits: Object.values(existenceMap).filter(Boolean).length,
      initialCacheMisses: Object.values(existenceMap).filter((val) => !val)
        .length,
      searchRefreshesPerformed: cacheStrategyResult.totalSearchRefreshes,
      placesRetrievedFromSearchRefresh:
        cacheStrategyResult.placesRetrievedFromSearchRefresh,
      individualApiCalls,
      individualApiErrors,
      finalResults: results.length,
      durationMs: endTime - startTime,
      averageTimePerPlace: (endTime - startTime) / placeIds.length
    }
  })

  return results
}
