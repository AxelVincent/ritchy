import 'dotenv/config'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'
import { divideRectangleIntoFour } from '../../utils/geo_utils'

import { logger } from '@ritchy/logger'
import { startDurationTimer } from '@ritchy/metrics'
import type { PlaceBase, PlacesSearchRequestBody } from '@ritchy/types'
import { sql } from 'drizzle-orm'
import { db } from '../../db/db'
import { place } from '../../db/schema/place'
import { enqueueTextSearchJob } from '../../internal/bullmq/jobs/google/places/queue'
import {
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'
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

export async function fetchSinglePage(
  formattedRequest: GooglePlacesTextSearchRequestBody,
): Promise<GooglePlacesTextSearchResponse> {
  const metricsTimer = startDurationTimer(externalApiDurationHistogram)
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
  const metricsTimer = startDurationTimer(externalApiDurationHistogram)
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

    const places = await db
      .insert(place)
      .values(
        parsedResults.map((place) => ({
          source: 'google' as const,
          source_id: place.id,
          source_url: place.googleMapsUri,
          website: place.websiteUri,
          name: place.displayName?.text,
          location: place.location,
          types: place.types,
          primary_type: place.primaryType,
          price_level: place.priceLevel,
          price_range: place.priceRange,
          rating: place.rating,
          rating_count: place.userRatingCount,
          phone: place.internationalPhoneNumber,
          utc_offset_minutes: place.utcOffsetMinutes,
          opening_hours: place.regularOpeningHours,
          formatted_address: place.formattedAddress,
          short_formatted_address: place.shortFormattedAddress,
          country:
            place.addressComponents?.find((component) =>
              component.types?.includes('country'),
            )?.longText || '',
          locality:
            place.addressComponents?.find((component) =>
              component.types?.includes('locality'),
            )?.longText || '',
          sublocality:
            place.addressComponents?.find((component) =>
              component.types?.includes('sublocality'),
            )?.longText || '',
          postal_code:
            place.addressComponents?.find((component) =>
              component.types?.includes('postal_code'),
            )?.longText || '',
          postal_code_suffix:
            place.addressComponents?.find((component) =>
              component.types?.includes('postal_code_suffix'),
            )?.longText || '',
          plus_code:
            place.addressComponents?.find((component) =>
              component.types?.includes('plus_code'),
            )?.longText || '',
          street:
            place.addressComponents?.find((component) =>
              component.types?.includes('route'),
            )?.longText || '',
          street_number:
            place.addressComponents?.find((component) =>
              component.types?.includes('street_number'),
            )?.longText || '',
          neighborhood:
            place.addressComponents?.find((component) =>
              component.types?.includes('neighborhood'),
            )?.longText || '',
          administrative_area_level_1:
            place.addressComponents?.find((component) =>
              component.types?.includes('administrative_area_level_1'),
            )?.longText || '',
          administrative_area_level_2:
            place.addressComponents?.find((component) =>
              component.types?.includes('administrative_area_level_2'),
            )?.longText || '',
          administrative_area_level_3:
            place.addressComponents?.find((component) =>
              component.types?.includes('administrative_area_level_3'),
            )?.longText || '',
          reviews:
            place.reviews?.map((review) => ({
              name: review.name,
              rating: review.rating,
              text: review.text,
              originalText: review.originalText,
              authorAttribution: review.authorAttribution,
              publishTime: review.publishTime,
              googleMapsUri: review.googleMapsUri,
            })) || [],
        })),
      )
      .returning({
        id: place.id,
        source: place.source,
        source_id: place.source_id,
        source_url: place.source_url,
        website: place.website,
        name: place.name,
        location: place.location,
        types: place.types,
        primary_type: place.primary_type,
        price_level: place.price_level,
        price_range: place.price_range,
        rating: place.rating,
        rating_count: place.rating_count,
        phone: place.phone,
        utc_offset_minutes: place.utc_offset_minutes,
        opening_hours: place.opening_hours,
        formatted_address: place.formatted_address,
        short_formatted_address: place.short_formatted_address,
        country: place.country,
        locality: place.locality,
        sublocality: place.sublocality,
        postal_code: place.postal_code,
        postal_code_suffix: place.postal_code_suffix,
        plus_code: place.plus_code,
        street: place.street,
        street_number: place.street_number,
        neighborhood: place.neighborhood,
        administrative_area_level_1: place.administrative_area_level_1,
        administrative_area_level_2: place.administrative_area_level_2,
        administrative_area_level_3: place.administrative_area_level_3,
        reviews: place.reviews,
        is_deleted: place.is_deleted,
        created_at: place.created_at,
        updated_at: place.updated_at,
      })
      .onConflictDoUpdate({
        target: place.source_id,
        set: {
          source: sql`excluded.source`,
          source_id: sql`excluded.source_id`,
          source_url: sql`excluded.source_url`,
          website: sql`excluded.website`,
          name: sql`excluded.name`,
          location: sql`excluded.location`,
          types: sql`excluded.types`,
          primary_type: sql`excluded.primary_type`,
          price_level: sql`excluded.price_level`,
          price_range: sql`excluded.price_range`,
          rating: sql`excluded.rating`,
          rating_count: sql`excluded.rating_count`,
          phone: sql`excluded.phone`,
          utc_offset_minutes: sql`excluded.utc_offset_minutes`,
          opening_hours: sql`excluded.opening_hours`,
          formatted_address: sql`excluded.formatted_address`,
          short_formatted_address: sql`excluded.short_formatted_address`,
          country: sql`excluded.country`,
          locality: sql`excluded.locality`,
          sublocality: sql`excluded.sublocality`,
          postal_code: sql`excluded.postal_code`,
          postal_code_suffix: sql`excluded.postal_code_suffix`,
          plus_code: sql`excluded.plus_code`,
          street: sql`excluded.street`,
          street_number: sql`excluded.street_number`,
          neighborhood: sql`excluded.neighborhood`,
          administrative_area_level_1: sql`excluded.administrative_area_level_1`,
          administrative_area_level_2: sql`excluded.administrative_area_level_2`,
          administrative_area_level_3: sql`excluded.administrative_area_level_3`,
          reviews: sql`excluded.reviews`,
          updated_at: sql`excluded.updated_at`,
          is_deleted: sql`excluded.is_deleted`,
        },
      })

    const results = places.map((place) => mapToPlaceDetails(place))

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
