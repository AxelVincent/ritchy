import 'dotenv/config'
import { logger } from '@ritchy/logger'
import type { Place } from '@ritchy/types'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'

import { mapToPlaceDetails } from './mapper'
import {
  ADVANCED_PLACE_KEYS_PLACE_DETAILS,
  type AdvancedPlace,
  AdvancedPlaceSchema,
} from './types'

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

export async function getPlaceDetailsV1(placeId: string): Promise<Place> {
  try {
    const data = await fetchPlaceDetails(placeId)
    AdvancedPlaceSchema.parse(data)

    const result = mapToPlaceDetails(data)

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
