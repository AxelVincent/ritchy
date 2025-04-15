import { logger } from '@ritchy/logger'
import type {
  AutocompletePrediction,
  AutocompleteRequestBody,
  AutocompleteResponse,
} from '@ritchy/types'
import { z } from 'zod'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'

// Schema for Google's specific response format
const GooglePlacesResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      placePrediction: z.object({
        placeId: z.string(),
        text: z.object({
          text: z.string(),
        }),
        structuredFormat: z.object({
          mainText: z.object({
            text: z.string(),
          }),
          secondaryText: z
            .object({
              text: z.string(),
            })
            .optional(),
        }),
        types: z.array(z.string()),
      }),
    }),
  ),
})

export async function postAutocompleteV1(
  requestBody: AutocompleteRequestBody,
): Promise<AutocompletePrediction[]> {
  const startTime = Date.now()

  try {
    const url = new URL(`${GOOGLE_MAPS_CONFIG.PLACES_URL}/places:autocomplete`)

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.PLACES_API_KEY,
        'X-Goog-FieldMask': '*',
        Referer: GOOGLE_MAPS_CONFIG.REFERRER,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json()
      logger.error({
        msg: 'Google Places Autocomplete API Error',
        event: 'google_places_autocomplete_error',
        metadata: {
          errorData,
          input: requestBody.input,
          statusCode: response.status,
          durationMs: Date.now() - startTime,
        },
      })
      throw new Error(`Google API error: ${response.status}`)
    }

    const data = await response.json()
    const validatedData = GooglePlacesResponseSchema.parse(data)

    // Map Google's response format to our API format
    const predictions = validatedData.suggestions.map((s) => ({
      placeId: s.placePrediction.placeId,
      text: s.placePrediction.text.text,
      mainText: s.placePrediction.structuredFormat.mainText.text,
      secondaryText: s.placePrediction.structuredFormat.secondaryText?.text,
      types: s.placePrediction.types,
    }))

    logger.info({
      msg: 'Google Places Autocomplete API Success',
      event: 'google_places_autocomplete_success',
      metadata: {
        input: requestBody.input,
        resultCount: predictions.length,
        durationMs: Date.now() - startTime,
      },
    })

    return predictions
  } catch (error) {
    logger.error({
      msg: 'Places autocomplete failed',
      event: 'places_autocomplete_error',
      metadata: {
        error,
        input: requestBody.input,
      },
    })
    throw error
  }
}
