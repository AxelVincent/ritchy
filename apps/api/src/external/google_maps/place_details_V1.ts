import 'dotenv/config'
import { logger } from '@ritchy/logger'
import type { PlaceBase } from '@ritchy/types'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'
import { CACHE_THRESHOLDS } from '../../config/redis'

import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { place } from '../../db/schema'
import { userPlace } from '../../db/schema'
import { placesApiQueue } from '../../internal/rate_limiter/config'
import { REDIS_KEYS } from '../../internal/redis/keys'
import { redisClient } from '../../internal/redis/redis'
import {
  AdvancedPlaceSchema,
  PREFERRED_PLACE_KEYS,
  type PreferredPlace,
} from './types'
import { calculateOpenNow } from './utils/calculateOpenNow'
import { mapToPlaceDetails } from './utils/mapper'

// Cache update thresholds imported from config
const { PLACE_UPDATE_THRESHOLD } = CACHE_THRESHOLDS

/**
 * Checks if cache needs to be updated based on updated_at timestamp
 * @param updatedAt - ISO string of last update time
 * @param maxAgeSeconds - Maximum age in seconds before update is needed
 * @returns True if cache needs update, false if fresh
 */
function needsUpdate(updatedAt: string, maxAgeSeconds: number): boolean {
  const updatedAtDate = new Date(updatedAt)
  const now = new Date()
  const ageInSeconds = (now.getTime() - updatedAtDate.getTime()) / 1000
  return ageInSeconds > maxAgeSeconds
}

/**
 * Gets cache age in seconds
 * @param updatedAt - ISO string of last update time
 * @returns Age in seconds
 */
function getAge(updatedAt: string): number {
  const updatedAtDate = new Date(updatedAt)
  const now = new Date()
  return (now.getTime() - updatedAtDate.getTime()) / 1000
}

async function fetchPlaceDetails(
  googlePlaceId: string,
): Promise<PreferredPlace> {
  const url = new URL(
    `${GOOGLE_MAPS_CONFIG.PLACES_URL}/places/${googlePlaceId}`,
  )

  const startTime = Date.now()

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.PLACES_API_KEY,
      'X-Goog-FieldMask': PREFERRED_PLACE_KEYS,
      Referer: GOOGLE_MAPS_CONFIG.REFERRER,
    },
  })

  if (!response.ok) {
    const errorData = await response.json()

    // Check if it's a 404 (place not found) or similar error
    if (response.status === 404) {
      logger.info({
        msg: 'Place not found in Google API',
        event: 'google_place_not_found',
        metadata: {
          googlePlaceId,
          errorData,
          statusCode: response.status,
          durationMs: Date.now() - startTime,
        },
      })
      await redisClient.markAsDeleted(googlePlaceId)
      throw new Error('PLACE_NOT_FOUND')
    }

    logger.error({
      msg: 'Google API Error Details',
      event: 'google_api_error',
      metadata: {
        errorData,
        googlePlaceId,
        statusCode: response.status,
        durationMs: Date.now() - startTime,
      },
    })
    throw new Error(
      `Google API error: ${response.status} - ${JSON.stringify(errorData)}`,
    )
  }

  const endTime = Date.now()

  logger.info({
    msg: 'Google Place Details API call successful - BILLABLE REQUEST UNIT',
    event: 'google_place_details_api_billable',
    metadata: {
      googlePlaceId,
      durationMs: endTime - startTime,
    },
  })

  return response.json()
}

export async function getPlaceDetailsV1(
  userPlaceId: string,
): Promise<PlaceBase & { fromCache: boolean; is_deleted?: boolean }> {
  const [placeId] = await db
    .select({
      sourceId: place.sourceId,
    })
    .from(place)
    .innerJoin(userPlace, eq(place.id, userPlace.placeId))
    .where(eq(userPlace.id, userPlaceId))
    .limit(1)

  const key = REDIS_KEYS.place(placeId.sourceId)

  // Single Redis call to get both data and metadata
  const cachedData = await redisClient.get<PreferredPlace>(key)

  if (cachedData) {
    // If place is marked as deleted, never refresh it
    if (cachedData.is_deleted) {
      const result = mapToPlaceDetails(cachedData.data)

      // Recalculate openNow property for cached places
      if (result.openingHours) {
        result.openingHours.openNow = calculateOpenNow(
          result.openingHours,
          result.utcOffsetMinutes,
        )
      }

      logger.info({
        msg: 'Returning cached deleted place data (no refresh needed)',
        event: 'place_details_deleted_cache_hit',
        metadata: {
          placeId,
          age: getAge(cachedData.updated_at),
        },
      })

      return {
        ...result,
        id: userPlaceId,
        fromCache: true,
        is_deleted: true,
      }
    }

    // For non-deleted places, check if cache needs update
    const shouldUpdate = needsUpdate(
      cachedData.updated_at,
      PLACE_UPDATE_THRESHOLD,
    )

    // If cache is fresh, return cached data
    if (!shouldUpdate) {
      const result = mapToPlaceDetails(cachedData.data)

      // Recalculate openNow property for cached places
      if (result.openingHours) {
        result.openingHours.openNow = calculateOpenNow(
          result.openingHours,
          result.utcOffsetMinutes,
        )
      }

      logger.info({
        msg: 'Returning fresh cached data',
        event: 'place_details_cache_hit',
        metadata: {
          placeId,
          age: getAge(cachedData.updated_at),
        },
      })

      return {
        ...result,
        id: userPlaceId,
        fromCache: true,
        is_deleted: false,
      }
    }

    // If cache needs update, try to fetch fresh data
    logger.info({
      msg: 'Cache needs update, attempting to fetch fresh data',
      event: 'place_details_cache_stale',
      metadata: {
        placeId,
        age: getAge(cachedData.updated_at),
      },
    })
  }

  try {
    const data = await placesApiQueue.addToQueue(async () =>
      fetchPlaceDetails(placeId.sourceId),
    )
    AdvancedPlaceSchema.parse(data)

    // Cache the raw Google API response
    await redisClient.set(key, data)

    // Map the data for the response
    const result = mapToPlaceDetails(data)

    logger.info({
      msg: 'Successfully fetched and cached fresh place data',
      event: 'place_details_fresh_data',
      metadata: { placeId },
    })

    return { ...result, id: userPlaceId, fromCache: false }
  } catch (error) {
    logger.info({
      msg: 'Error fetching place details',
      event: 'place_details_fetch_error',
      metadata: { placeId, error },
    })

    if (error instanceof Error && error.message === 'PLACE_NOT_FOUND') {
      if (cachedData) {
        await redisClient.markAsDeleted(key)
        logger.info({
          msg: 'Marked existing place as deleted',
          event: 'place_details_marked_deleted',
          metadata: { placeId },
        })
      }
    }

    if (cachedData) {
      logger.info({
        msg: 'API failed, returning cached data as fallback',
        event: 'place_details_api_fallback',
        metadata: {
          placeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })

      const result = mapToPlaceDetails(cachedData.data)
      if (result.openingHours) {
        result.openingHours.openNow = calculateOpenNow(
          result.openingHours,
          result.utcOffsetMinutes,
        )
      }

      return {
        ...result,
        id: userPlaceId,
        fromCache: true,
        is_deleted: cachedData.is_deleted,
      }
    }

    // Re-throw error if no cached data available
    throw error
  }
}
