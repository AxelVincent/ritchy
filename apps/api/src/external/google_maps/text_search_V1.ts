import 'dotenv/config'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'
import { divideRectangleIntoFour } from '../../utils/geo_utils'

import { logger } from '@ritchy/logger'
import type { PlaceBase, PlacesSearchRequestBody } from '@ritchy/types'
import { sql } from 'drizzle-orm'
import { db } from '../../db/db'
import { place } from '../../db/schema/place'
import { enqueueTextSearchJob } from '../../internal/bullmq/jobs/google/places/queue'
import { REDIS_KEYS } from '../../internal/redis/keys'
import { redisClient } from '../../internal/redis/redis'
import {
  type GooglePlacesTextSearchRequestBody,
  GooglePlacesTextSearchRequestBodySchema,
  type GooglePlacesTextSearchResponse,
  GooglePlacesTextSearchResponseSchema,
  PREFERRED_PLACE_KEYS_TEXT_SEARCH,
} from './types'
import { mapToPlacesSearchResult } from './utils/mapper'

export async function fetchSinglePage(
  formattedRequest: GooglePlacesTextSearchRequestBody,
): Promise<GooglePlacesTextSearchResponse> {
  const url = new URL(`${GOOGLE_MAPS_CONFIG.PLACES_URL}/places:searchText`)

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
        'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.PLACES_API_KEY,
        'X-Goog-FieldMask': PREFERRED_PLACE_KEYS_TEXT_SEARCH,
        Referer: GOOGLE_MAPS_CONFIG.REFERRER,
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
): Promise<Omit<PlaceBase, 'id'>[]> {
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
    const startTime = Date.now()
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

    const places = await db
      .insert(place)
      .values(
        allResults.map((place) => ({
          source: 'google' as const,
          sourceId: place.id,
          sourceUrl: place.googleMapsUri,
          website: place.websiteUri,
          name: place.displayName?.text,
          location: place.location,
          types: place.types,
          primaryType: place.primaryType,
          priceLevel: place.priceLevel,
          priceRange: place.priceRange,
          rating: place.rating,
          ratingCount: place.userRatingCount,
          phone: place.internationalPhoneNumber,
          utcOffsetMinutes: place.utcOffsetMinutes,
          openingHours: place.regularOpeningHours,
          formattedAddress: place.formattedAddress,
          shortFormattedAddress: place.shortFormattedAddress,
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
          postalCode:
            place.addressComponents?.find((component) =>
              component.types?.includes('postal_code'),
            )?.longText || '',
          postalCodeSuffix:
            place.addressComponents?.find((component) =>
              component.types?.includes('postal_code_suffix'),
            )?.longText || '',
          plusCode:
            place.addressComponents?.find((component) =>
              component.types?.includes('plus_code'),
            )?.longText || '',
          street:
            place.addressComponents?.find((component) =>
              component.types?.includes('route'),
            )?.longText || '',
          streetNumber:
            place.addressComponents?.find((component) =>
              component.types?.includes('street_number'),
            )?.longText || '',
          neighborhood:
            place.addressComponents?.find((component) =>
              component.types?.includes('neighborhood'),
            )?.longText || '',
          administrativeAreaLevel1:
            place.addressComponents?.find((component) =>
              component.types?.includes('administrative_area_level_1'),
            )?.longText || '',
          administrativeAreaLevel2:
            place.addressComponents?.find((component) =>
              component.types?.includes('administrative_area_level_2'),
            )?.longText || '',
          administrativeAreaLevel3:
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
        sourceId: place.sourceId,
        sourceUrl: place.sourceUrl,
        website: place.website,
        name: place.name,
        location: place.location,
        types: place.types,
        primaryType: place.primaryType,
        priceLevel: place.priceLevel,
        priceRange: place.priceRange,
        rating: place.rating,
        ratingCount: place.ratingCount,
        phone: place.phone,
        utcOffsetMinutes: place.utcOffsetMinutes,
        openingHours: place.openingHours,
        formattedAddress: place.formattedAddress,
        shortFormattedAddress: place.shortFormattedAddress,
        country: place.country,
        locality: place.locality,
        sublocality: place.sublocality,
        postalCode: place.postalCode,
        postalCodeSuffix: place.postalCodeSuffix,
        plusCode: place.plusCode,
        street: place.street,
        streetNumber: place.streetNumber,
        neighborhood: place.neighborhood,
        administrativeAreaLevel1: place.administrativeAreaLevel1,
        administrativeAreaLevel2: place.administrativeAreaLevel2,
        administrativeAreaLevel3: place.administrativeAreaLevel3,
        reviews: place.reviews,
        isDeleted: place.isDeleted,
      })
      .onConflictDoUpdate({
        target: place.sourceId,
        set: {
          source: sql`excluded.source`,
          sourceId: sql`excluded.source_id`,
          sourceUrl: sql`excluded.source_url`,
          website: sql`excluded.website`,
          name: sql`excluded.name`,
          location: sql`excluded.location`,
          types: sql`excluded.types`,
          primaryType: sql`excluded.primary_type`,
          priceLevel: sql`excluded.price_level`,
          priceRange: sql`excluded.price_range`,
          rating: sql`excluded.rating`,
          ratingCount: sql`excluded.rating_count`,
          phone: sql`excluded.phone`,
          utcOffsetMinutes: sql`excluded.utc_offset_minutes`,
          openingHours: sql`excluded.opening_hours`,
          formattedAddress: sql`excluded.formatted_address`,
          shortFormattedAddress: sql`excluded.short_formatted_address`,
          country: sql`excluded.country`,
          locality: sql`excluded.locality`,
          sublocality: sql`excluded.sublocality`,
          postalCode: sql`excluded.postal_code`,
          postalCodeSuffix: sql`excluded.postal_code_suffix`,
          plusCode: sql`excluded.plus_code`,
          street: sql`excluded.street`,
          streetNumber: sql`excluded.street_number`,
          neighborhood: sql`excluded.neighborhood`,
          administrativeAreaLevel1: sql`excluded.administrative_area_level_1`,
          administrativeAreaLevel2: sql`excluded.administrative_area_level_2`,
          administrativeAreaLevel3: sql`excluded.administrative_area_level_3`,
          reviews: sql`excluded.reviews`,
          updatedAt: sql`excluded.updated_at`,
          isDeleted: sql`excluded.is_deleted`,
        },
      })

    const results = places.map((place) => ({
      sourceId: place.sourceId,
      website: place.website || '',
      name: place.name || '',
      location: place.location || { latitude: 0, longitude: 0 },
      types: place.types || [],
      primaryType: place.primaryType || undefined,
      priceLevel: place.priceLevel || undefined,
      priceRange: place.priceRange || undefined,
      rating: place.rating || undefined,
      ratingCount: place.ratingCount || undefined,
      googleMapsUri: place.sourceUrl || '',
      phone: place.phone || undefined,
      utcOffsetMinutes: place.utcOffsetMinutes || 0,
      openingHours: place.openingHours || undefined,
      isDeleted: place.isDeleted,
      address: {
        formattedAddress: place.formattedAddress || '',
        shortFormattedAddress: place.shortFormattedAddress || '',
        country: place.country || '',
        locality: place.locality || '',
        sublocality: place.sublocality || '',
        postalCode: place.postalCode || '',
        postalCodeSuffix: place.postalCodeSuffix || '',
        plusCode: place.plusCode || '',
        street: place.street || '',
        streetNumber: place.streetNumber || '',
        neighborhood: place.neighborhood || '',
        administrativeAreaLevel1: place.administrativeAreaLevel1 || '',
        administrativeAreaLevel2: place.administrativeAreaLevel2 || '',
        administrativeAreaLevel3: place.administrativeAreaLevel3 || '',
      },
    }))

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
