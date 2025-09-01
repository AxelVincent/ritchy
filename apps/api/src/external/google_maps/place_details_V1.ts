import 'dotenv/config'
import { logger } from '@ritchy/logger'
import type { PlaceBase } from '@ritchy/types'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'
import { CACHE_THRESHOLDS } from '../../config/redis'

import { sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../db/db'
import { place as placeTable } from '../../db/schema'
import type * as schema from '../../db/schema'
import { enqueuePlaceDetailsJob } from '../../internal/bullmq/jobs/google/places/queue'
import { redisClient } from '../../internal/redis/redis'
import { getPlaceByUserPlaceId } from '../../services/places/queries/get_place_by_user_place_id'
import {
  AdvancedPlaceSchema,
  PREFERRED_PLACE_KEYS,
  type PreferredPlace,
} from './types'
import { calculateOpenNow } from './utils/calculateOpenNow'
import { mapToPlaceDetails } from './utils/mapper'

// Cache update thresholds imported from config
const { PLACE_UPDATE_THRESHOLD } = CACHE_THRESHOLDS

/**
 * Checks if cache needs to be updated based on updated_at timestamp
 * @param updatedAt - ISO string of last update time
 * @param maxAgeSeconds - Maximum age in seconds before update is needed
 * @returns True if cache needs update, false if fresh
 */
function needsUpdate(updatedAt: string, maxAgeSeconds: number): boolean {
  const updatedAtDate = new Date(updatedAt)
  const now = new Date()
  const ageInSeconds = (now.getTime() - updatedAtDate.getTime()) / 1000
  return ageInSeconds > maxAgeSeconds
}

/**
 * Gets cache age in seconds
 * @param updatedAt - ISO string of last update time
 * @returns Age in seconds
 */
function getAge(updatedAt: string): number {
  const updatedAtDate = new Date(updatedAt)
  const now = new Date()
  return (now.getTime() - updatedAtDate.getTime()) / 1000
}

export async function fetchPlaceDetails(
  googlePlaceId: string,
): Promise<PreferredPlace> {
  const url = new URL(
    `${GOOGLE_MAPS_CONFIG.PLACES_URL}/places/${googlePlaceId}`,
  )

  const startTime = Date.now()

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.PLACES_API_KEY,
      'X-Goog-FieldMask': PREFERRED_PLACE_KEYS,
      Referer: GOOGLE_MAPS_CONFIG.REFERRER,
    },
  })

  if (!response.ok) {
    const errorData = await response.json()

    // Check if it's a 404 (place not found) or similar error
    if (response.status === 404) {
      logger.info({
        msg: 'Place not found in Google API',
        event: 'google_place_not_found',
        metadata: {
          googlePlaceId,
          errorData,
          statusCode: response.status,
          durationMs: Date.now() - startTime,
        },
      })
      await redisClient.markAsDeleted(googlePlaceId)
      throw new Error('PLACE_NOT_FOUND')
    }

    logger.error({
      msg: 'Google API Error Details',
      event: 'google_api_error',
      metadata: {
        errorData,
        googlePlaceId,
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
    msg: 'Google Place Details API call successful - BILLABLE REQUEST UNIT',
    event: 'google_place_details_api_billable',
    metadata: {
      googlePlaceId,
      durationMs: endTime - startTime,
    },
  })

  return response.json()
}

export async function getPlaceDetailsV1(
  userPlaceId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<PlaceBase & { fromCache: boolean; is_deleted?: boolean }> {
  const dbOrTx = tx ?? db
  const place = await getPlaceByUserPlaceId(userPlaceId, dbOrTx)

  if (place.sourceUrl) {
    // If place is marked as deleted, never refresh it
    if (place.isDeleted) {
      const result = mapToPlaceDetails(place)

      // Recalculate openNow property for cached places
      if (result.openingHours) {
        result.openingHours.openNow = calculateOpenNow(
          result.openingHours,
          result.utcOffsetMinutes,
        )
      }

      logger.info({
        msg: 'Returning cached deleted place data (no refresh needed)',
        event: 'place_details_deleted_cache_hit',
        metadata: {
          placeId: place.id,
          age: getAge(place.updatedAt.toISOString()),
        },
      })

      return {
        ...result,
        id: userPlaceId,
        fromCache: true,
        is_deleted: place.isDeleted,
      }
    }

    // For non-deleted places, check if cache needs update
    const shouldUpdate = needsUpdate(
      place.updatedAt.toISOString(),
      PLACE_UPDATE_THRESHOLD,
    )

    // If cache is fresh, return cached data
    if (!shouldUpdate) {
      const result = mapToPlaceDetails(place)

      // Recalculate openNow property for cached places
      if (result.openingHours) {
        result.openingHours.openNow = calculateOpenNow(
          result.openingHours,
          result.utcOffsetMinutes,
        )
      }

      logger.info({
        msg: 'Returning fresh cached data',
        event: 'place_details_cache_hit',
        metadata: {
          placeSourceId: place.sourceId,
          age: getAge(place.updatedAt.toISOString()),
        },
      })

      return {
        ...result,
        id: userPlaceId,
        fromCache: true,
        is_deleted: false,
      }
    }

    // If cache needs update, try to fetch fresh data
    logger.info({
      msg: 'Cache needs update, attempting to fetch fresh data',
      event: 'place_details_cache_stale',
      metadata: {
        placeSourceId: place.sourceId,
        age: getAge(place.updatedAt.toISOString()),
      },
    })
  }

  try {
    const data = await enqueuePlaceDetailsJob(place.sourceId)
    AdvancedPlaceSchema.parse(data)

    const [updatedPlace] = await db
      .insert(placeTable)
      .values({
        source: 'google' as const,
        sourceId: data.id,
        sourceUrl: data.googleMapsUri,
        website: data.websiteUri,
        name: data.displayName?.text,
        location: data.location,
        types: data.types,
        primaryType: data.primaryType,
        priceLevel: data.priceLevel,
        priceRange: data.priceRange,
        rating: data.rating,
        ratingCount: data.userRatingCount,
        phone: data.internationalPhoneNumber,
        utcOffsetMinutes: data.utcOffsetMinutes,
        openingHours: data.regularOpeningHours,
        formattedAddress: data.formattedAddress,
        shortFormattedAddress: data.shortFormattedAddress,
        country:
          data.addressComponents?.find((component) =>
            component.types?.includes('country'),
          )?.longText || '',
        locality:
          data.addressComponents?.find((component) =>
            component.types?.includes('locality'),
          )?.longText || '',
        sublocality:
          data.addressComponents?.find((component) =>
            component.types?.includes('sublocality'),
          )?.longText || '',
        postalCode:
          data.addressComponents?.find((component) =>
            component.types?.includes('postal_code'),
          )?.longText || '',
        postalCodeSuffix:
          data.addressComponents?.find((component) =>
            component.types?.includes('postal_code_suffix'),
          )?.longText || '',
        plusCode:
          data.addressComponents?.find((component) =>
            component.types?.includes('plus_code'),
          )?.longText || '',
        street:
          data.addressComponents?.find((component) =>
            component.types?.includes('route'),
          )?.longText || '',
        streetNumber:
          data.addressComponents?.find((component) =>
            component.types?.includes('street_number'),
          )?.longText || '',
        neighborhood:
          data.addressComponents?.find((component) =>
            component.types?.includes('neighborhood'),
          )?.longText || '',
        administrativeAreaLevel1:
          data.addressComponents?.find((component) =>
            component.types?.includes('administrative_area_level_1'),
          )?.longText || '',
        administrativeAreaLevel2:
          data.addressComponents?.find((component) =>
            component.types?.includes('administrative_area_level_2'),
          )?.longText || '',
        administrativeAreaLevel3:
          data.addressComponents?.find((component) =>
            component.types?.includes('administrative_area_level_3'),
          )?.longText || '',
        reviews:
          data.reviews?.map((review) => ({
            name: review.name,
            rating: review.rating,
            text: review.text,
            originalText: review.originalText,
            authorAttribution: review.authorAttribution,
            publishTime: review.publishTime,
            googleMapsUri: review.googleMapsUri,
          })) || [],
      })
      .returning({
        id: placeTable.id,
        source: placeTable.source,
        sourceId: placeTable.sourceId,
        sourceUrl: placeTable.sourceUrl,
        website: placeTable.website,
        name: placeTable.name,
        location: placeTable.location,
        types: placeTable.types,
        primaryType: placeTable.primaryType,
        priceLevel: placeTable.priceLevel,
        priceRange: placeTable.priceRange,
        rating: placeTable.rating,
        ratingCount: placeTable.ratingCount,
        phone: placeTable.phone,
        utcOffsetMinutes: placeTable.utcOffsetMinutes,
        openingHours: placeTable.openingHours,
        formattedAddress: placeTable.formattedAddress,
        shortFormattedAddress: placeTable.shortFormattedAddress,
        country: placeTable.country,
        locality: placeTable.locality,
        sublocality: placeTable.sublocality,
        postalCode: placeTable.postalCode,
        postalCodeSuffix: placeTable.postalCodeSuffix,
        plusCode: placeTable.plusCode,
        street: placeTable.street,
        streetNumber: placeTable.streetNumber,
        neighborhood: placeTable.neighborhood,
        administrativeAreaLevel1: placeTable.administrativeAreaLevel1,
        administrativeAreaLevel2: placeTable.administrativeAreaLevel2,
        administrativeAreaLevel3: placeTable.administrativeAreaLevel3,
        isDeleted: placeTable.isDeleted,
        reviews: placeTable.reviews,
        createdAt: placeTable.createdAt,
        updatedAt: placeTable.updatedAt,
      })
      .onConflictDoUpdate({
        target: placeTable.sourceId,
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

    // Map the data for the response
    const result = mapToPlaceDetails(updatedPlace)

    logger.info({
      msg: 'Successfully fetched and cached fresh place data',
      event: 'place_details_fresh_data',
      metadata: { placeSourceId: place.sourceId },
    })

    return { ...result, id: userPlaceId, fromCache: false }
  } catch (error) {
    logger.info({
      msg: 'Error fetching place details',
      event: 'place_details_fetch_error',
      metadata: { placeSourceId: place.sourceId, error },
    })

    if (error instanceof Error && error.message === 'PLACE_NOT_FOUND') {
      if (place.sourceUrl) {
        await redisClient.markAsDeleted(place.sourceId)
        logger.info({
          msg: 'Marked existing place as deleted',
          event: 'place_details_marked_deleted',
          metadata: { placeSourceId: place.sourceId },
        })
      }
    }

    if (place.sourceUrl) {
      logger.info({
        msg: 'API failed, returning cached data as fallback',
        event: 'place_details_api_fallback',
        metadata: {
          placeSourceId: place.sourceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })

      const result = mapToPlaceDetails(place)
      if (result.openingHours) {
        result.openingHours.openNow = calculateOpenNow(
          result.openingHours,
          result.utcOffsetMinutes,
        )
      }

      return {
        ...result,
        id: userPlaceId,
        fromCache: true,
        is_deleted: place.isDeleted,
      }
    }

    // Re-throw error if no cached data available
    throw error
  }
}
