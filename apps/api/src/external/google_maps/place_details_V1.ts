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
): Promise<PlaceBase & { fromCache: boolean }> {
  const key = REDIS_KEYS.place(placeId)
  // Check cache first
  const cachedData = await redisClient.get<PreferredPlace>(key)

  if (cachedData) {
    // Apply mapper to cached raw data
    const result = mapToPlaceDetails(cachedData)

    // Recalculate openNow property for cached places
    if (result.openingHours) {
      result.openingHours.openNow = calculateOpenNow(
        result.openingHours,
        result.utcOffsetMinutes,
      )
    }

    return { ...result, fromCache: true }
  }

  const data = await placesApiQueue.addToQueue(async () =>
    fetchPlaceDetails(placeId),
  )
  AdvancedPlaceSchema.parse(data)

  // Cache the raw Google API response
  await redisClient.set(key, data)

  // Map the data for the response
  const result = mapToPlaceDetails(data)

  return { ...result, fromCache: false }
}
