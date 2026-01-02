import { logger } from '@ritchy/logger'

import type { PlaceBase, PlacesSearchRequestBody } from '@ritchy/types'
import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { search, searchPlace } from '../../db/schema'
import {
  createSimpleDurationTimer,
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'
import { getPlaceByUserPlaceId } from '../../services/places/queries/get_place_by_user_place_id'
import type { PlaceWithEnrichedAt } from '../../services/places/queries/get_places_by_user_place_ids'
import { getPlaceDetailsV1 } from './place_details_V1'
import { postTextSearchV1 } from './text_search_V1'
import { mapToPlaceDetails } from './utils/mapper'

// Cost constants for Google API calls (in USD)
const COST_PER_PLACE_DETAILS_CALL = 0.04 // $0.04 per call

export type PlaceDetailsOptimized = PlaceBase & {
  id: string
  fromCache: boolean
  enrichedAt: Date | null
}

const isInCache = (place: PlaceWithEnrichedAt): boolean => {
  return place.source_url != null && place.source_url !== ''
}

export async function getPlaceDetailsOptimized(
  place: PlaceWithEnrichedAt,
): Promise<PlaceDetailsOptimized> {
  const metricsTimer = createSimpleDurationTimer(externalApiDurationHistogram)
  let httpStatusCode = '500'

  if (place.is_deleted) {
    logger.info({
      msg: 'Returning cached deleted place data',
      event: 'cached_deleted_place_data',
      metadata: {
        placeId: place.user_place_id,
      },
    })
    return {
      ...mapToPlaceDetails(place),
      id: place.user_place_id,
      fromCache: true,
      enrichedAt: place.enriched_at,
    }
  }
  if (isInCache(place)) {
    logger.debug({
      msg: 'Returning cached place data',
      event: 'cached_place_data',
      metadata: {
        placeId: place.user_place_id,
      },
    })
    const placeDetails = mapToPlaceDetails(place)
    return {
      ...placeDetails,
      id: place.user_place_id,
      fromCache: true,
      enrichedAt: place.enriched_at,
    }
  }

  logger.debug({
    msg: 'Place not found in cache, checking for search',
    event: 'no_cached_place_found',
    metadata: {
      userPlaceId: place.user_place_id,
    },
  })
  const [searchPlaceResult] = await db
    .select({
      searchId: searchPlace.searchId,
      searchUpdatedAt: search.updatedAt,
    })
    .from(searchPlace)
    .innerJoin(search, eq(search.id, searchPlace.searchId))
    .where(eq(searchPlace.userPlaceId, place.user_place_id))
    .limit(1)

  const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60)
  if (searchPlaceResult && searchPlaceResult.searchUpdatedAt < oneHourAgo) {
    logger.info({
      msg: 'Search place result found',
      event: 'search_place_result_found',
      metadata: {
        userPlaceId: place.user_place_id,
        searchPlaceResult,
      },
    })
    // Get search details
    const [searchDetails] = await db
      .select({
        keyword: search.keyword,
        rectangle: search.rectangle,
        updatedAt: search.updatedAt,
        model: search.model,
      })
      .from(search)
      .where(eq(search.id, searchPlaceResult.searchId))
      .limit(1)

    if (searchDetails) {
      logger.info({
        msg: 'Refreshing search for place',
        event: 'refresh_search_for_place',
        metadata: {
          userPlaceId: place.user_place_id,
          searchId: searchPlaceResult.searchId,
          model: searchDetails.model,
        },
      })

      // Create search request
      const searchRequestBody: PlacesSearchRequestBody = {
        textQuery: searchDetails.keyword,
        rectangle: searchDetails.rectangle,
        model: searchDetails.model,
      }
      // Execute the search and cache the results
      await postTextSearchV1(searchRequestBody)

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
          model: searchDetails.model,
        },
      })

      // Check if our place is now in cache
      const refreshedPlace = await getPlaceByUserPlaceId(place.user_place_id)
      if (isInCache(refreshedPlace)) {
        const placeDetails = mapToPlaceDetails(refreshedPlace)
        return {
          ...placeDetails,
          id: refreshedPlace.user_place_id,
          fromCache: true,
          enrichedAt: refreshedPlace.enriched_at,
        }
      }
    }
  }

  logger.info({
    msg: 'Fetching individual place details - BILLABLE API CALL',
    event: 'fetch_individual_place',
    metadata: {
      userPlaceId: place.user_place_id,
      estimatedCost: COST_PER_PLACE_DETAILS_CALL,
    },
  })

  try {
    const result = await getPlaceDetailsV1({ userPlaceId: place.user_place_id })
    httpStatusCode = '200'

    logger.info({
      msg: 'Place details optimization metrics',
      event: 'place_details_optimization',
      metadata: {
        userPlaceId: place.user_place_id,
        searchId: searchPlaceResult.searchId,
        fromCache: result.fromCache,
      },
    })

    // Track successful request
    metricsTimer.stop({
      service: 'google_maps',
      endpoint: 'place_details_optimized',
    })
    externalApiRequestsCounter.inc({
      service: 'google_maps',
      endpoint: 'place_details_optimized',
      status_code: httpStatusCode,
    })

    return {
      ...result,
      id: place.user_place_id,
      fromCache: false,
      enrichedAt: place.enriched_at,
    }
  } catch (error) {
    // Track error in metrics
    metricsTimer.stop({
      service: 'google_maps',
      endpoint: 'place_details_optimized',
    })
    externalApiRequestsCounter.inc({
      service: 'google_maps',
      endpoint: 'place_details_optimized',
      status_code: httpStatusCode,
    })

    logger.error({
      msg: 'Place details fetch failed',
      event: 'place_details_fetch_error',
      metadata: {
        userPlaceId: place.user_place_id,
        searchId: searchPlaceResult.searchId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}
