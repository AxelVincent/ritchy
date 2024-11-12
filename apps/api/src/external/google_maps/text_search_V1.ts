import type {
  SearchRequestBody,
  TextSearchResponse
} from '@ritchy/types/src/places'
import 'dotenv/config'
import { GOOGLE_MAPS_CONFIG } from 'src/config/google_maps'
import { z } from 'zod'

const searchRequestSchema = z.object({
  textQuery: z.string().min(1),
  locationBias: z.object({
    circle: z.object({
      center: z.object({
        latitude: z.number(),
        longitude: z.number()
      }),
      radiusInMeters: z.number().positive()
    })
  }),
  pageSize: z.number().int().positive().optional()
})

export async function postTextSearchV1(
  requestBody: SearchRequestBody
): Promise<TextSearchResponse> {
  const validatedRequest = searchRequestSchema.parse(requestBody)
  const url = new URL(`${GOOGLE_MAPS_CONFIG.BASE_URL}/places:searchText`)

  const radiusInDegrees =
    validatedRequest.locationBias.circle.radiusInMeters / 111139 // Earth's radius in meters

  const locationRestriction = {
    rectangle: {
      low: {
        latitude:
          validatedRequest.locationBias.circle.center.latitude -
          radiusInDegrees,
        longitude:
          validatedRequest.locationBias.circle.center.longitude -
          radiusInDegrees
      },
      high: {
        latitude:
          validatedRequest.locationBias.circle.center.latitude +
          radiusInDegrees,
        longitude:
          validatedRequest.locationBias.circle.center.longitude +
          radiusInDegrees
      }
    }
  }

  const formattedRequest = {
    textQuery: validatedRequest.textQuery,
    locationRestriction,
    maxResultCount: validatedRequest.pageSize
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.API_KEY,
        'X-Goog-FieldMask': '*'
      },
      body: JSON.stringify(formattedRequest)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Google API Error Details:', errorData)
      throw new Error(
        `Google API error: ${response.status} - ${JSON.stringify(errorData)}`
      )
    }

    const data: TextSearchResponse = await response.json()
    console.log('Google Places API request successful', {
      query: requestBody.textQuery,
      resultCount: data.places?.length ?? 0
    })
    return data
  } catch (error) {
    console.log('Google Places API request failed', {
      error,
      query: requestBody.textQuery
    })
    throw error
  }
}
