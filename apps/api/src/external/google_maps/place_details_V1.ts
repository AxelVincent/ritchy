import 'dotenv/config'
import { logger } from '@ritchy/logger'
import type { Place, PlaceBase } from '@ritchy/types'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'

import { REDIS_KEYS } from '../../lib/redis/keys'
import { redisClient } from '../../lib/redis/redis'
import {
  ADVANCED_PLACE_KEYS_PLACE_DETAILS,
  type AdvancedPlace,
  AdvancedPlaceSchema,
} from './types'
import { calculateOpenNow } from './utils/calculateOpenNow'
import { mapToPlaceDetails } from './utils/mapper'
import { placesApiQueue } from './utils/places_api_queue'

async function fetchPlaceDetails(placeId: string): Promise<AdvancedPlace> {
  const url = new URL(`${GOOGLE_MAPS_CONFIG.BASE_URL}/places/${placeId}`)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.API_KEY,
      'X-Goog-FieldMask': ADVANCED_PLACE_KEYS_PLACE_DETAILS,
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    logger.error({
      msg: 'Google API Error Details',
      event: 'google_api_error',
      metadata: { errorData, placeId },
    })
    throw new Error(
      `Google API error: ${response.status} - ${JSON.stringify(errorData)}`,
    )
  }

  return response.json()
}

export async function getPlaceDetailsV1(
  placeId: string,
): Promise<PlaceBase & { fromCache: boolean }> {
  const key = REDIS_KEYS.place(placeId)
  // Check cache first
  const cachedPlace = await redisClient.get<PlaceBase>(key)
  if (cachedPlace) {
    // Recalculate openNow property for cached places
    if (cachedPlace.openingHours) {
      cachedPlace.openingHours.openNow = calculateOpenNow(
        cachedPlace.openingHours,
        cachedPlace.utcOffsetMinutes,
      )
    }

    return { ...cachedPlace, fromCache: true }
  }

  const data = await placesApiQueue.addToQueue(async () =>
    fetchPlaceDetails(placeId),
  )
  AdvancedPlaceSchema.parse(data)
  const result = mapToPlaceDetails(data)
  await redisClient.set(key, result)

  return { ...result, fromCache: false }
}
