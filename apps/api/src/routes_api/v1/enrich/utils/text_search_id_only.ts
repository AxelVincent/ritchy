import { logger } from '@ritchy/logger'
import { z } from 'zod'
import { GOOGLE_MAPS_CONFIG } from '../../../../config/google_maps'

const TextSearchIdOnlyResponseSchema = z.object({
  places: z
    .array(
      z.object({
        id: z.string(), // This is the Place ID (ChIJ...)
      }),
    )
    .default([]),
})

export type TextSearchIdOnlyParams = {
  textQuery: string
  locationBias?: {
    circle: {
      center: { latitude: number; longitude: number }
      radius: number // meters
    }
  }
}

/**
 * Text Search (ID Only) - FREE tier
 * Returns only Place IDs, no billing for this request type
 *
 * Use this to resolve:
 * - Business name + coordinates → Place ID
 * - Address string → Place ID
 */
export const textSearchIdOnly = async (
  params: TextSearchIdOnlyParams,
): Promise<string | null> => {
  const url = new URL(`${GOOGLE_MAPS_CONFIG.PLACES_URL}/places:searchText`)

  const body: Record<string, unknown> = {
    textQuery: params.textQuery,
  }

  // Add location bias if coordinates available (improves accuracy)
  if (params.locationBias) {
    body.locationBias = params.locationBias
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id',
        Referer: GOOGLE_MAPS_CONFIG.REFERRER,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      logger.error({
        msg: 'Text Search ID Only API error',
        event: 'text_search_id_only_error',
        metadata: { errorData, textQuery: params.textQuery },
      })
      return null
    }

    const data = await response.json()
    const validated = TextSearchIdOnlyResponseSchema.parse(data)

    if (validated.places.length === 0) {
      logger.info({
        msg: 'No places found for text query',
        event: 'text_search_id_only_no_results',
        metadata: { textQuery: params.textQuery },
      })
      return null
    }

    // Return the first (most relevant) result
    const placeId = validated.places[0].id

    logger.info({
      msg: 'Text Search ID Only successful (FREE)',
      event: 'text_search_id_only_success',
      metadata: {
        textQuery: params.textQuery,
        placeId,
        resultCount: validated.places.length,
      },
    })

    return placeId
  } catch (error) {
    logger.error({
      msg: 'Text Search ID Only failed',
      event: 'text_search_id_only_failure',
      metadata: {
        textQuery: params.textQuery,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    return null
  }
}
