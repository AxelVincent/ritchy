import 'dotenv/config'
import { logger } from '@ritchy/logger'
import type { Place } from '@ritchy/types'
import NodeCache from 'node-cache'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'

import { mapToPlaceDetails } from './mapper'
import {
  type AdvancedPlace,
  AdvancedPlaceSchema,
  PREFERRED_PLACE_KEYS,
} from './types'

// Initialize cache with 1 week TTL (in seconds)
const placeCache = new NodeCache({ stdTTL: 7 * 24 * 60 * 60 })

async function fetchPlaceDetails(placeId: string): Promise<AdvancedPlace> {
  const url = new URL(`${GOOGLE_MAPS_CONFIG.BASE_URL}/places/${placeId}`)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.API_KEY,
      'X-Goog-FieldMask': PREFERRED_PLACE_KEYS,
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

export async function getPlaceDetailsV1(placeId: string): Promise<Place> {
  try {
    // Check cache first
    const cachedPlace = placeCache.get<Place>(placeId)
    if (cachedPlace) {
      logger.info({
        msg: 'Retrieved place details from cache',
        event: 'google_place_details_cache_hit',
        metadata: { placeId },
      })
      return cachedPlace
    }

    const data = await fetchPlaceDetails(placeId)
    AdvancedPlaceSchema.parse(data)

    const result = mapToPlaceDetails(data)

    // Store in cache
    placeCache.set(placeId, result)

    logger.info({
      msg: 'Google Place Details API request successful',
      event: 'google_place_details_api_success',
      metadata: {
        placeId,
        resultId: result.id,
      },
    })

    return result
  } catch (error) {
    logger.error({
      msg: 'Google Place Details API request failed',
      event: 'google_place_details_api_failure',
      metadata: {
        error,
        placeId,
      },
    })
    throw error
  }
}
