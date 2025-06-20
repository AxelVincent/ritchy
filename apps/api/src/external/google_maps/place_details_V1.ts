import 'dotenv/config'
import { logger } from '@ritchy/logger'
import type { Place, PlaceBase } from '@ritchy/types'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'

import { REDIS_KEYS } from '../../lib/redis/keys'
import { redisClient } from '../../lib/redis/redis'
import {
  AdvancedPlaceSchema,
  PREFERRED_PLACE_KEYS,
  type PreferredPlace,
} from './types'
import { calculateOpenNow } from './utils/calculateOpenNow'
import { mapToPlaceDetails } from './utils/mapper'
import { placesApiQueue } from './utils/places_api_queue'

// Cache update thresholds
const PLACE_CACHE_UPDATE_THRESHOLD = 24 * 60 * 60 // 24 hours
const DELETED_PLACE_CACHE_UPDATE_THRESHOLD = 7 * 24 * 60 * 60 // 7 days

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

async function fetchPlaceDetails(placeId: string): Promise<PreferredPlace> {
  const url = new URL(`${GOOGLE_MAPS_CONFIG.PLACES_URL}/places/${placeId}`)

  const startTime = Date.now()

  try {
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
          msg: 'Place not found in Google API - marking as deleted',
          event: 'google_place_not_found',
          metadata: {
            placeId,
            statusCode: response.status,
            durationMs: Date.now() - startTime,
          },
        })
        throw new Error('PLACE_NOT_FOUND')
      }

      logger.error({
        msg: 'Google API Error Details',
        event: 'google_api_error',
        metadata: {
          errorData,
          placeId,
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
        placeId,
        durationMs: endTime - startTime,
      },
    })

    return response.json()
  } catch (error) {
    const endTime = Date.now()

    logger.error({
      msg: 'Google Place Details API call failed',
      event: 'google_place_details_api_failure',
      metadata: {
        placeId,
        durationMs: endTime - startTime,
        error,
      },
    })

    throw error
  }
}

export async function getPlaceDetailsV1(
  placeId: string,
): Promise<PlaceBase & { fromCache: boolean; is_deleted?: boolean }> {
  const key = REDIS_KEYS.place(placeId)

  // Single Redis call to get both data and metadata
  const cachedData = await redisClient.get<PreferredPlace>(key)

  if (cachedData) {
    // Determine update threshold based on deletion status
    const updateThreshold = cachedData.is_deleted
      ? DELETED_PLACE_CACHE_UPDATE_THRESHOLD
      : PLACE_CACHE_UPDATE_THRESHOLD

    // Check if cache needs update using local function (no Redis call)
    const shouldUpdate = needsUpdate(cachedData.updated_at, updateThreshold)

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
          is_deleted: cachedData.is_deleted,
          age: getAge(cachedData.updated_at),
        },
      })

      return {
        ...result,
        fromCache: true,
        is_deleted: cachedData.is_deleted,
      }
    }

    // If cache needs update but we have data, try to fetch fresh data
    logger.info({
      msg: 'Cache needs update, attempting to fetch fresh data',
      event: 'place_details_cache_stale',
      metadata: {
        placeId,
        is_deleted: cachedData.is_deleted,
        age: getAge(cachedData.updated_at),
      },
    })
  }

  try {
    const data = await placesApiQueue.addToQueue(async () =>
      fetchPlaceDetails(placeId),
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

    return { ...result, fromCache: false }
  } catch (error) {
    // If place is not found, mark existing cache as deleted
    if (error instanceof Error && error.message === 'PLACE_NOT_FOUND') {
      if (cachedData) {
        // Mark existing cache as deleted
        await redisClient.markAsDeleted(key)

        const result = mapToPlaceDetails(cachedData.data)
        if (result.openingHours) {
          result.openingHours.openNow = calculateOpenNow(
            result.openingHours,
            result.utcOffsetMinutes,
          )
        }

        logger.info({
          msg: 'Marked existing place as deleted',
          event: 'place_details_marked_deleted',
          metadata: { placeId },
        })

        return {
          ...result,
          fromCache: true,
          is_deleted: true,
        }
      }

      logger.info({
        msg: 'Created deleted place entry',
        event: 'place_details_created_deleted',
        metadata: { placeId },
      })
    }

    // If we have cached data but API failed, return cached data
    if (cachedData) {
      logger.warn({
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
        fromCache: true,
        is_deleted: cachedData.is_deleted,
      }
    }

    // Re-throw error if no cached data available
    throw error
  }
}
