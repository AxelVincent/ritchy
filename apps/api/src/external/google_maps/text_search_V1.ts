import 'dotenv/config'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'
import { divideRectangleIntoFour } from '../../utils/geo_utils'

import { logger } from '@ritchy/logger'

import { enqueueTextSearchJob } from '../../internal/bullmq/jobs/google/places/queue'
import {
  createSimpleDurationTimer,
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'
import type { PlaceBase, PlacesSearchRequestBody } from '../../shared'
import { sanitizeApiData } from '../../utils/sanitize_api_data'
import {
  type GooglePlacesTextSearchRequestBody,
  GooglePlacesTextSearchRequestBodySchema,
  type GooglePlacesTextSearchResponse,
  GooglePlacesTextSearchResponseSchema,
  PREFERRED_PLACE_KEYS_TEXT_SEARCH,
  PreferredPlaceSchema,
} from './types'
import { mapToPlaceDetails } from './utils/mapper'
import { upsertGooglePlaces } from './utils/upsert_place'

export async function fetchSinglePage(
  formattedRequest: GooglePlacesTextSearchRequestBody,
): Promise<GooglePlacesTextSearchResponse> {
  const metricsTimer = createSimpleDurationTimer(externalApiDurationHistogram)
  let httpStatusCode = '500'

  const url = new URL(`${GOOGLE_MAPS_CONFIG.PLACES_URL}/places:searchText`)

  const body = {
    textQuery: formattedRequest.textQuery,
    locationRestriction: formattedRequest.locationRestriction,
    pageToken: formattedRequest.nextPageToken,
    pageSize: 20,
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.PLACES_API_KEY,
        'X-Goog-FieldMask': PREFERRED_PLACE_KEYS_TEXT_SEARCH,
        Referer: GOOGLE_MAPS_CONFIG.REFERRER,
      },
      body: JSON.stringify(body),
    })

    httpStatusCode = response.status.toString()

    if (!response.ok) {
      const errorData = await response.json()
      logger.error({
        msg: 'Google API Error Details',
        event: 'google_api_error',
        metadata: {
          errorData,
          textQuery: formattedRequest.textQuery,
          statusCode: response.status,
        },
      })

      // Track error in metrics
      metricsTimer.stop({ service: 'google_maps', endpoint: 'text_search' })
      externalApiRequestsCounter.inc({
        service: 'google_maps',
        endpoint: 'text_search',
        status_code: httpStatusCode,
      })

      throw new Error(
        `Google API error: ${response.status} - ${JSON.stringify(errorData)}`,
      )
    }

    logger.info({
      msg: 'Google Text Search API call successful - BILLABLE REQUEST UNIT',
      event: 'google_text_search_api_billable',
      metadata: {
        textQuery: formattedRequest.textQuery,
        pageToken: formattedRequest.nextPageToken ? 'present' : 'none',
      },
    })

    // Track successful request
    metricsTimer.stop({ service: 'google_maps', endpoint: 'text_search' })
    externalApiRequestsCounter.inc({
      service: 'google_maps',
      endpoint: 'text_search',
      status_code: httpStatusCode,
    })

    return response.json()
  } catch (error) {
    // Track error if not already tracked above
    if (httpStatusCode === '500') {
      metricsTimer.stop({ service: 'google_maps', endpoint: 'text_search' })
      externalApiRequestsCounter.inc({
        service: 'google_maps',
        endpoint: 'text_search',
        status_code: httpStatusCode,
      })
    }

    logger.error({
      msg: 'Google Text Search API call failed',
      event: 'google_text_search_api_failure',
      metadata: {
        textQuery: formattedRequest.textQuery,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    throw error
  }
}

export async function postTextSearchV1(
  requestBody: PlacesSearchRequestBody,
): Promise<Omit<PlaceBase, 'id'>[]> {
  const metricsTimer = createSimpleDurationTimer(externalApiDurationHistogram)
  const httpStatusCode = '200'

  const ratio = 1
  // 60 potential results
  // 1 * 3 = 3 requests
  // 3 * 0.04 = 0.12 $
  // 0.12 / 2 = 0.06 $
  const squares60 = [requestBody.rectangle]
  // 240 potential results
  // 4 * 3 = 12 requests
  // 12 * 0.04 = 0.48 $
  // 0.48 / 2 = 0.24 $
  const squares240 = divideRectangleIntoFour(requestBody.rectangle, ratio)
  // 240 * 4 = 960 potential results
  // 12 * 4 = 48 requests
  // 48 * 0.04 = 1.92 $
  // 1.92 / 2 = 0.96 $
  // 1.92 / 4 = 0.48 $
  const squares960 = squares240.flatMap((square) =>
    divideRectangleIntoFour(square, ratio),
  )
  // 960 * 4 = 3840 potential results
  // 48 * 4 = 192 requests
  // 192 * 0.04 = 7.68 $
  // 7.68 / 2 = 3.84 $
  const squares3840 = squares960.flatMap((square) =>
    divideRectangleIntoFour(square, ratio),
  )

  const squares = (() => {
    switch (requestBody.model) {
      case 'EXPERT':
        return squares3840
      case 'ADVANCED':
        return squares960
      case 'ENHANCED':
        return squares240
      case 'BASIC':
        return squares60
      default:
        return squares60
    }
  })()

  try {
    const allResults: GooglePlacesTextSearchResponse['places'] = []
    let apiRequestCount = 0
    const resultsQuantity = 60
    for (const square of squares) {
      let nextPageToken = undefined
      let currentSquareQuantity = 0
      let pageCount = 0

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
        const data = await enqueueTextSearchJob(validatedRequest)
        GooglePlacesTextSearchResponseSchema.parse(data)

        if (data.places) {
          allResults.push(...data.places)
          currentSquareQuantity += data.places.length
        }

        nextPageToken = data.nextPageToken // Update nextPageToken with the new token
        apiRequestCount++
        pageCount++
        // Stop if we have enough results, no more pages, or reached 3 pages
        // There is a bug where the Google API continues to return nextPageToken even when there are no more pages
        // So we need to stop when we have enough results to avoid infinite loop and extra requests
      } while (
        nextPageToken &&
        currentSquareQuantity < resultsQuantity &&
        pageCount < 3
      )
    }

    // Deduplicate results by sourceId before database insertion
    const uniqueResults = allResults.filter(
      (place, index, self) =>
        index === self.findIndex((p) => p.id === place.id),
    )
    const parsedResults = []
    for (const place of uniqueResults) {
      parsedResults.push(PreferredPlaceSchema.parse(sanitizeApiData(place)))
    }

    // Return early if no results to avoid empty insert
    if (parsedResults.length === 0) {
      logger.info({
        msg: 'No places found after parsing',
        event: 'no_places_after_parsing',
        metadata: {
          query: requestBody.textQuery,
          model: requestBody.model,
          uniqueResultsCount: uniqueResults.length,
        },
      })

      // Track successful request (even with 0 results)
      metricsTimer.stop({ service: 'google_maps', endpoint: 'text_search' })
      externalApiRequestsCounter.inc({
        service: 'google_maps',
        endpoint: 'text_search',
        status_code: httpStatusCode,
      })

      return []
    }

    const places = await upsertGooglePlaces(parsedResults)

    const results = places.map((p) => mapToPlaceDetails(p))

    logger.info({
      msg: 'Google Places Text Search complete',
      event: 'google_places_text_search_complete',
      metadata: {
        query: requestBody.textQuery,
        model: requestBody.model,
        resultCount: results.length,
        apiRequestCount,
        squareCount: squares.length,
      },
    })

    // Track successful request
    metricsTimer.stop({ service: 'google_maps', endpoint: 'text_search' })
    externalApiRequestsCounter.inc({
      service: 'google_maps',
      endpoint: 'text_search',
      status_code: httpStatusCode,
    })

    return results
  } catch (error) {
    // Track error in metrics
    metricsTimer.stop({ service: 'google_maps', endpoint: 'text_search' })
    externalApiRequestsCounter.inc({
      service: 'google_maps',
      endpoint: 'text_search',
      status_code: '500',
    })

    logger.info({
      msg: 'Google Places API request failed',
      event: 'google_places_api_failure',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        query: requestBody.textQuery,
      },
    })
    throw error
  }
}
