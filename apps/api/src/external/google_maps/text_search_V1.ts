import 'dotenv/config'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'
import {
  divideSquareIntoFour,
  getLargestSquareFromCoordinates,
} from '../../utils/geo_utils'

import { logger } from '@ritchy/logger'
import type { Place, PlaceBase, PlacesSearchRequestBody } from '@ritchy/types'
import { REDIS_KEYS } from '../../lib/redis/keys'
import { redisClient } from '../../lib/redis/redis'
import {
  type GooglePlacesTextSearchRequestBody,
  GooglePlacesTextSearchRequestBodySchema,
  type GooglePlacesTextSearchResponse,
  GooglePlacesTextSearchResponseSchema,
  PREFERRED_PLACE_KEYS_TEXT_SEARCH,
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

  const startTime = Date.now()

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.API_KEY,
        'X-Goog-FieldMask': PREFERRED_PLACE_KEYS_TEXT_SEARCH,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      logger.error({
        msg: 'Google API Error Details',
        event: 'google_api_error',
        metadata: {
          errorData,
          textQuery: formattedRequest.textQuery,
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
      msg: 'Google Text Search API call successful - BILLABLE REQUEST UNIT',
      event: 'google_text_search_api_billable',
      metadata: {
        textQuery: formattedRequest.textQuery,
        pageToken: formattedRequest.nextPageToken ? 'present' : 'none',
        durationMs: endTime - startTime,
      },
    })

    return response.json()
  } catch (error) {
    const endTime = Date.now()

    logger.error({
      msg: 'Google Text Search API call failed',
      event: 'google_text_search_api_failure',
      metadata: {
        textQuery: formattedRequest.textQuery,
        durationMs: endTime - startTime,
        error,
      },
    })

    throw error
  }
}

export async function postTextSearchV1(
  requestBody: PlacesSearchRequestBody,
): Promise<PlaceBase[]> {
  const largestSquare = getLargestSquareFromCoordinates(
    requestBody.locationBias.circle.center,
    requestBody.locationBias.circle.radiusInMeters,
  )

  const ratio = 1
  // 60 potential results
  // 1 * 3 = 3 requests
  // 3 * 0.04 = 0.12 $
  // 0.12 / 2 = 0.06 $
  const squares60 = [largestSquare]
  // 240 potential results
  // 4 * 3 = 12 requests
  // 12 * 0.04 = 0.48 $
  // 0.48 / 2 = 0.24 $
  const squares240 = divideSquareIntoFour(largestSquare, ratio)
  // 240 * 4 = 960 potential results
  // 12 * 4 = 48 requests
  // 48 * 0.04 = 1.92 $
  // 1.92 / 2 = 0.96 $
  const squares960 = squares240.flatMap((square) =>
    divideSquareIntoFour(square, ratio),
  )
  // 960 * 4 = 3840 potential results
  // 48 * 4 = 192 requests
  // 192 * 0.04 = 7.68 $
  // 7.68 / 2 = 3.84 $
  const squares3840 = squares960.flatMap((square) =>
    divideSquareIntoFour(square, ratio),
  )

  const squares = (() => {
    switch (requestBody.model) {
      case 'PRO':
        return squares3840
      case 'EXPLORER':
        return squares960
      case 'NAVIGATOR':
        return squares240
      case 'ESSENTIALS':
        return squares60
      default:
        return squares60
    }
  })()

  try {
    const allResults: GooglePlacesTextSearchResponse['places'] = []
    let apiRequestCount = 0
    const resultsQuantity = 60
    const startTime = Date.now()
    for (const square of squares) {
      let nextPageToken = undefined
      let currentSquareQuantity = 0

      do {
        const formattedRequest = {
          textQuery: requestBody.textQuery,
          locationRestriction: {
            rectangle: {
              low: square.southWest,
              high: square.northEast,
            },
          },
          nextPageToken,
          resultsQuantity,
        }

        const validatedRequest =
          GooglePlacesTextSearchRequestBodySchema.parse(formattedRequest)

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
      } while (nextPageToken && currentSquareQuantity < resultsQuantity)
    }

    // Track duplicates for logging
    const seenIds = new Set<string>()
    const duplicates = new Set<string>()

    const uniqueResults = allResults.filter((place) => {
      if (seenIds.has(place.id)) {
        duplicates.add(place.id)
        return false
      }
      seenIds.add(place.id)
      return true
    })

    logger.info({
      msg: 'Duplicate places filtered',
      event: 'places_deduplication',
      metadata: {
        totalPlaces: allResults.length,
        uniquePlaces: uniqueResults.length,
        duplicatesRemoved: duplicates.size,
        duplicateIds: Array.from(duplicates),
      },
    })

    // Cache each unique place
    await Promise.all(
      uniqueResults.map(async (place) => {
        const key = REDIS_KEYS.place(place.id)
        // Cache the raw Google API response
        await redisClient.set(key, place)
      }),
    )

    const results = mapToPlacesSearchResult({ places: uniqueResults })

    const endTime = Date.now()
    logger.info({
      msg: 'Google Places Text Search complete',
      event: 'google_places_text_search_complete',
      metadata: {
        query: requestBody.textQuery,
        model: requestBody.model,
        resultCount: results.length,
        apiRequestCount,
        squareCount: squares.length,
        totalDurationMs: endTime - startTime,
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
