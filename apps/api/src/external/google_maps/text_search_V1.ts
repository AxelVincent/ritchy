import 'dotenv/config'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'
import {
  divideSquareIntoFour,
  getLargestSquareFromCoordinates,
} from '../../utils/geo_utils'

import { logger } from '@ritchy/logger'
import type {
  PlacesSearchRequestBody,
  PlacesSearchResponse,
} from '@ritchy/types'
import { REDIS_KEYS } from '../../lib/redis/keys'
import { redisClient } from '../../lib/redis/redis'
import {
  ADVANCED_PLACE_KEYS_TEXT_SEARCH,
  type GooglePlacesTextSearchRequestBody,
  GooglePlacesTextSearchRequestBodySchema,
  type GooglePlacesTextSearchResponse,
  GooglePlacesTextSearchResponseSchema,
} from './types'
import { mapToPlacesSearchResult } from './utils/mapper'
import { placesApiQueue } from './utils/places_api_queue'

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
      'X-Goog-FieldMask': ADVANCED_PLACE_KEYS_TEXT_SEARCH,
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
  requestBody: PlacesSearchRequestBody,
): Promise<PlacesSearchResponse> {
  const largestSquare = getLargestSquareFromCoordinates(
    requestBody.locationBias.circle.center,
    requestBody.locationBias.circle.radiusInMeters,
  )

  // 60 potential results
  // 1 * 3 = 3 requests
  // 3 * 0.04 = 0.12 $
  // 0.12 / 2 = 0.06 $
  const squares60 = [largestSquare]
  // 240 potential results
  // 4 * 3 = 12 requests
  // 12 * 0.04 = 0.48 $
  // 0.48 / 2 = 0.24 $
  const squares240 = divideSquareIntoFour(largestSquare, 0.95)
  // 240 * 4 = 960 potential results
  // 12 * 4 = 48 requests
  // 48 * 0.04 = 1.92 $
  // 1.92 / 2 = 0.96 $
  const squares960 = squares240.flatMap((square) =>
    divideSquareIntoFour(square, 0.95),
  )
  // 960 * 4 = 3840 potential results
  // 48 * 4 = 192 requests
  // 192 * 0.04 = 7.68 $
  // 7.68 / 2 = 3.84 $
  const squares3840 = squares960.flatMap((square) =>
    divideSquareIntoFour(square, 0.95),
  )

  const squares = (() => {
    switch (requestBody.model) {
      case 'PRO':
        return squares3840
      case 'EXPLORER':
        return squares960
      case 'NAVIGATOR':
        return squares240
      case 'DEFAULT':
        return squares60
      default:
        return squares60
    }
  })()

  try {
    const allResults: GooglePlacesTextSearchResponse['places'] = []
    let apiRequestCount = 0
    for (const square of squares) {
      let nextPageToken: string | undefined
      let currentSquareQuantity = 0
      const formattedRequest = {
        textQuery: requestBody.textQuery,
        locationRestriction: {
          rectangle: {
            low: square.southWest,
            high: square.northEast,
          },
        },
        nextPageToken,
        resultsQuantity: 60,
      }

      const validatedRequest =
        GooglePlacesTextSearchRequestBodySchema.parse(formattedRequest)

      do {
        const data = await placesApiQueue.addToQueue(async () =>
          fetchSinglePage(validatedRequest),
        )
        GooglePlacesTextSearchResponseSchema.parse(data)

        if (data.places) {
          allResults.push(...data.places)
          currentSquareQuantity += data.places.length
        }

        nextPageToken = data.nextPageToken // Update nextPageToken with the new token
        apiRequestCount++
        // Stop if we have enough results or no more pages
      } while (
        nextPageToken &&
        currentSquareQuantity < validatedRequest.resultsQuantity
      )
    }

    const uniqueResults = allResults.filter(
      (place, index, self) =>
        index === self.findIndex((t) => t.id === place.id),
    )

    // Cache each unique place
    await Promise.all(
      uniqueResults.map(async (place) => {
        const key = REDIS_KEYS.place(place.id)
        const mappedPlace = mapToPlacesSearchResult({ places: [place] })[0]
        await redisClient.set(key, mappedPlace)
      }),
    )

    const results = mapToPlacesSearchResult({ places: uniqueResults })

    logger.info({
      msg: 'Google Places API request successful',
      event: 'google_places_api_success',
      metadata: {
        query: requestBody.textQuery,
        resultIds: results.map((result) => result.id),
        resultCount: results.length,
        pagesRequested: apiRequestCount,
        cachedPlaces: uniqueResults.length,
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
