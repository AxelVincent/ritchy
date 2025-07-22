import { logger } from '@ritchy/logger'
import type {
  Place,
  PlaceBase,
  PlacesSearchRequestBody,
  Status
} from '@ritchy/types'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../db/db'
import {
  listPlace,
  place,
  search,
  searchPlace,
  userPlace,
  status as statusTable
} from '../../db/schema'
import { REDIS_KEYS } from '../redis/keys'
import { redisClient } from '../redis/redis'
import { getPlaceDetailsV1 } from './place_details_V1'
import { postTextSearchV1 } from './text_search_V1'
import type { PreferredPlace } from './types'
import { mapToPlaceDetails } from './utils/mapper'

// How recently a search should have been refreshed to be considered "fresh" (in milliseconds)
// 1 day = 24 * 60 * 60 * 1000 = 86,400,000 ms
const SEARCH_FRESHNESS_THRESHOLD = 86_400_000 // 1 day

// Cost constants for Google API calls (in USD)
const COST_PER_PLACE_DETAILS_CALL = 0.04 // $0.04 per call
const COST_PER_TEXT_SEARCH_CALL = 0.04 // $0.04 per call

// Track which searches are currently being refreshed
const activeSearchRefreshes = new Map<
  string,
  Promise<Omit<PlaceBase, 'id'>[]>
>()

// Get estimated API calls for a search model
function getEstimatedApiCallsForModel(model: string): number {
  switch (model) {
    case 'ESSENTIALS':
      return 3 // ~60 results, ~3 API calls
    case 'NAVIGATOR':
      return 12 // ~240 results, ~12 API calls
    case 'EXPLORER':
      return 48 // ~960 results, ~48 API calls
    case 'PRO':
      return 192 // ~3840 results, ~192 API calls
    default:
      return 3
  }
}

export type PlaceDetailsOptimized = PlaceBase & {
  id: string
  fromCache: boolean
  isEnriched: boolean
}

export async function getPlaceDetailsOptimized(
  userPlaceId: string
): Promise<PlaceDetailsOptimized> {
  const startTime = Date.now()
  let scenario = 'unknown'
  let apiCallsMade = 0
  let estimatedCost = 0

  const [placeResult] = await db
    .select({
      sourceId: place.sourceId,
      isEnriched: userPlace.isEnriched
    })
    .from(place)
    .innerJoin(userPlace, eq(place.id, userPlace.placeId))
    .where(eq(userPlace.id, userPlaceId))
    .limit(1)

  const key = REDIS_KEYS.place(placeResult.sourceId)
  const cachedPlace = await redisClient.get<PreferredPlace>(key)

  if (cachedPlace) {
    scenario = 'cache_hit'
    // Only log cache hits in summary statistics, not individually
    const place = mapToPlaceDetails(cachedPlace.data)
    return {
      ...place,
      id: userPlaceId,
      fromCache: true,
      isEnriched: placeResult.isEnriched
    }
  }

  const [searchPlaceResult] = await db
    .select({ searchId: searchPlace.searchId })
    .from(searchPlace)
    .innerJoin(userPlace, eq(searchPlace.userPlaceId, userPlace.id))
    .where(eq(userPlace.placeId, userPlaceId))
    .limit(1)

  // If we have a searchId, check if we should refresh the search
  if (searchPlaceResult) {
    // Get search details
    const searchDetails = await db
      .select()
      .from(search)
      .where(eq(search.id, searchPlaceResult.searchId))
      .limit(1)

    if (searchDetails.length > 0) {
      const searchData = searchDetails[0]

      // Check if the search was recently refreshed
      const lastRefreshTime = searchData.updatedAt.getTime()
      const currentTime = Date.now()
      const isSearchStale =
        currentTime - lastRefreshTime > SEARCH_FRESHNESS_THRESHOLD

      // Only proceed with search refresh check if the search is stale
      if (isSearchStale) {
        // Get the estimated API calls for this search model
        const estimatedApiCalls = getEstimatedApiCallsForModel(searchData.model)

        // Count how many places in lists are associated with this search
        const placesFromSearch = await db
          .select({ count: sql`COUNT(*)` })
          .from(listPlace)
          .where(eq(listPlace.searchId, searchPlaceResult.searchId))

        const placeCount = Number(placesFromSearch[0]?.count || 0)

        // Only refresh the search if we have more places than API calls
        if (placeCount > estimatedApiCalls) {
          scenario = 'search_refreshed'

          // Check if this search is already being refreshed by another request
          const existingRefresh = activeSearchRefreshes.get(
            searchPlaceResult.searchId
          )

          if (existingRefresh) {
            logger.info({
              msg: 'Using already in-progress search refresh',
              event: 'reuse_search_refresh',
              metadata: {
                userPlaceId,
                searchId: searchPlaceResult.searchId,
                model: searchData.model
              }
            })

            // Wait for the existing refresh to complete
            await existingRefresh

            // Check if our place is now in cache after the search refresh
            const refreshedPlace = await redisClient.get<PreferredPlace>(key)
            if (refreshedPlace) {
              const place = mapToPlaceDetails(refreshedPlace.data)
              return {
                ...place,
                id: userPlaceId,
                fromCache: true,
                isEnriched: placeResult.isEnriched
              }
            }
          } else {
            // Start a new refresh and track it
            logger.info({
              msg: 'Refreshing stale search results to update place cache',
              event: 'refresh_search_for_place',
              metadata: {
                userPlaceId,
                searchId: searchPlaceResult.searchId,
                model: searchData.model,
                lastRefreshTime: searchData.updatedAt.toISOString(),
                timeSinceRefresh: `${Math.round((currentTime - lastRefreshTime) / 1000 / 60 / 60 / 24)} days`,
                placeCount,
                estimatedApiCalls,
                costEfficiency: (placeCount / estimatedApiCalls).toFixed(2)
              }
            })

            // Create search request
            const searchRequestBody: PlacesSearchRequestBody = {
              textQuery: searchData.keyword,
              rectangle: searchData.rectangle,
              model: searchData.model
            }

            // Store the refresh promise
            const refreshPromise = (async () => {
              try {
                // Execute the search and cache the results
                const results = await postTextSearchV1(searchRequestBody)

                // Update the search timestamp
                await db
                  .update(search)
                  .set({ updatedAt: new Date() })
                  .where(eq(search.id, searchPlaceResult.searchId))

                logger.info({
                  msg: 'Search refresh completed - BILLABLE API CALL OVERVIEW',
                  event: 'search_refresh_completed',
                  metadata: {
                    searchId: searchPlaceResult.searchId,
                    model: searchData.model,
                    estimatedApiCalls,
                    estimatedCost:
                      estimatedApiCalls * COST_PER_TEXT_SEARCH_CALL,
                    potentialCostSavings: Math.max(
                      0,
                      (results.length - estimatedApiCalls) *
                        COST_PER_PLACE_DETAILS_CALL
                    )
                  }
                })

                return results
              } finally {
                // Remove from active refreshes when done
                activeSearchRefreshes.delete(searchPlaceResult.searchId)
              }
            })()

            // Store the promise
            activeSearchRefreshes.set(
              searchPlaceResult.searchId,
              refreshPromise
            )

            // Wait for the refresh to complete
            await refreshPromise

            // Check if our place is now in cache
            const refreshedPlace = await redisClient.get<Place>(key)
            if (refreshedPlace) {
              const place = mapToPlaceDetails(refreshedPlace.data)
              return {
                ...place,
                id: userPlaceId,
                fromCache: true,
                isEnriched: placeResult.isEnriched
              }
            }
          }
        } else {
          // Skip search refresh because we don't have enough places to make it cost-effective
          scenario = 'skip_refresh_not_cost_effective'

          logger.info({
            msg: 'Skipping search refresh as it is not cost-effective',
            event: 'skip_refresh_not_cost_effective',
            metadata: {
              userPlaceId,
              searchId: searchPlaceResult.searchId,
              model: searchData.model,
              placeCount,
              estimatedApiCalls,
              costEfficiency:
                placeCount > 0 ? (placeCount / estimatedApiCalls).toFixed(2) : 0
            }
          })
        }
      } else {
        scenario = 'recent_search_skip_refresh'

        logger.info({
          msg: 'Skipping search refresh as it was recently updated',
          event: 'skip_search_refresh',
          metadata: {
            userPlaceId,
            searchId: searchPlaceResult.searchId,
            lastRefreshTime: searchData.updatedAt.toISOString(),
            timeSinceRefresh: `${Math.round((currentTime - lastRefreshTime) / 1000 / 60 / 60 / 24)} days`,
            model: searchData.model
          }
        })
      }
    }
  }

  // If we still don't have the place, fetch it directly
  scenario = 'direct_fetch'

  logger.info({
    msg: 'Fetching individual place details - BILLABLE API CALL',
    event: 'fetch_individual_place',
    metadata: {
      userPlaceId,
      searchId: searchPlaceResult.searchId,
      estimatedCost: COST_PER_PLACE_DETAILS_CALL
    }
  })

  try {
    const result = await getPlaceDetailsV1(userPlaceId)
    apiCallsMade += 1
    estimatedCost += COST_PER_PLACE_DETAILS_CALL

    const endTime = Date.now()
    logger.info({
      msg: 'Place details optimization metrics',
      event: 'place_details_optimization',
      metadata: {
        userPlaceId,
        searchId: searchPlaceResult.searchId,
        scenario,
        apiCallsMade,
        estimatedCost,
        durationMs: endTime - startTime,
        fromCache: result.fromCache
      }
    })

    return {
      ...result,
      id: userPlaceId,
      fromCache: false,
      isEnriched: placeResult.isEnriched
    }
  } catch (error) {
    const endTime = Date.now()
    logger.error({
      msg: 'Place details fetch failed',
      event: 'place_details_fetch_error',
      metadata: {
        userPlaceId,
        searchId: searchPlaceResult.searchId,
        scenario,
        apiCallsMade,
        estimatedCost,
        durationMs: endTime - startTime,
        error
      }
    })
    throw error
  }
}
