import 'dotenv/config'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'
import { getLargestSquareFromCoordinates } from '../../utils/geo_utils'

import { logger } from '@ritchy/logger'
import type { PlacesSearchResponse } from '@ritchy/types'
import {
  ADVANCED_PLACE_KEYS,
  type GooglePlacesTextSearchRequestBody,
  GooglePlacesTextSearchRequestBodySchema,
  type GooglePlacesTextSearchResponse,
  GooglePlacesTextSearchResponseSchema,
} from './types'

function mapToPlacesSearchResult(
  response: GooglePlacesTextSearchResponse,
): PlacesSearchResponse {
  if (!response.places) return []

  return response.places.map((place) => ({
    id: place.id,
    websiteUri: place.websiteUri || '',
    displayName: place.displayName?.text || '',
    location: {
      latitude: place.location?.latitude || 0,
      longitude: place.location?.longitude || 0,
    },
    types: place.types || [],
    formattedAddress: place.formattedAddress || '',
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    shortFormattedAddress: place.shortFormattedAddress,
    googleMapsUri: place.googleMapsUri || '',
    internationalPhoneNumber: place.internationalPhoneNumber,
    utcOffsetMinutes: place.utcOffsetMinutes || 0,
    regularOpeningHours: place.regularOpeningHours,
  }))
}

async function fetchSinglePage(
  formattedRequest: GooglePlacesTextSearchRequestBody,
): Promise<GooglePlacesTextSearchResponse> {
  const url = new URL(`${GOOGLE_MAPS_CONFIG.BASE_URL}/places:searchText`)

  const body = {
    textQuery: formattedRequest.textQuery,
    locationRestriction: formattedRequest.locationRestriction,
    pageToken: formattedRequest.nextPageToken,
    pageSize: 20,
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.API_KEY,
      'X-Goog-FieldMask': ADVANCED_PLACE_KEYS,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorData = await response.json()
    logger.error({
      msg: 'Google API Error Details',
      event: 'google_api_error',
      metadata: { errorData },
    })
    throw new Error(
      `Google API error: ${response.status} - ${JSON.stringify(errorData)}`,
    )
  }

  return response.json()
}

export async function postTextSearchV1(
  requestBody: GooglePlacesTextSearchRequestBody,
): Promise<PlacesSearchResponse> {
  const validatedRequest =
    GooglePlacesTextSearchRequestBodySchema.parse(requestBody)

  try {
    const allResults: GooglePlacesTextSearchResponse['places'] = []
    let nextPageToken: string | undefined

    do {
      const formattedRequest = {
        textQuery: validatedRequest.textQuery,
        locationRestriction: validatedRequest.locationRestriction,
        nextPageToken,
        resultsQuantity: validatedRequest.resultsQuantity,
      }

      const data = await fetchSinglePage(formattedRequest)
      GooglePlacesTextSearchResponseSchema.parse(data)

      if (data.places) {
        allResults.push(...data.places)
      }

      nextPageToken = data.nextPageToken // Update nextPageToken with the new token

      // Add delay between requests as required by Google
      if (nextPageToken) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      // Stop if we have enough results or no more pages
    } while (
      nextPageToken &&
      allResults.length < validatedRequest.resultsQuantity
    )

    const results = mapToPlacesSearchResult({ places: allResults })

    logger.info({
      msg: 'Google Places API request successful',
      event: 'google_places_api_success',
      metadata: {
        query: requestBody.textQuery,
        resultIds: results.map((result) => result.id),
        resultCount: results.length,
        pagesRequested: Math.ceil(results.length / 20),
      },
    })

    return results
  } catch (error) {
    logger.info({
      msg: 'Google Places API request failed',
      event: 'google_places_api_failure',
      metadata: {
        error,
        query: requestBody.textQuery,
      },
    })
    throw error
  }
}
