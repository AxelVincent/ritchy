import 'dotenv/config'
import { logger } from '@ritchy/logger'

import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'
import type { PlaceBase } from '../../shared'

import { eq, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../db/db'
import { place as placeTable } from '../../db/schema'
import type * as schema from '../../db/schema'
import { enqueuePlaceDetailsJob } from '../../internal/bullmq/jobs/google/places/queue'
import {
  createSimpleDurationTimer,
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'
import { getPlaceBySourceId } from '../../services/places/queries/get_place_by_source_id'
import { getPlaceByUserPlaceId } from '../../services/places/queries/get_place_by_user_place_id'
import type { PlaceWithEnrichedAt } from '../../services/places/queries/get_places_by_user_place_ids'
import { sanitizeApiData } from '../../utils/sanitize_api_data'
import {
  PREFERRED_PLACE_KEYS,
  type PreferredPlace,
  PreferredPlaceSchema,
} from './types'
import { calculateOpenNow } from './utils/calculateOpenNow'
import { mapToPlaceDetails } from './utils/mapper'

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
  const metricsTimer = createSimpleDurationTimer(externalApiDurationHistogram)
  let httpStatusCode = '500'

  const url = new URL(
    `${GOOGLE_MAPS_CONFIG.PLACES_URL}/places/${googlePlaceId}`,
  )

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.PLACES_API_KEY,
        'X-Goog-FieldMask': PREFERRED_PLACE_KEYS,
        Referer: GOOGLE_MAPS_CONFIG.REFERRER,
      },
    })

    httpStatusCode = response.status.toString()

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
          },
        })
        await db
          .update(placeTable)
          .set({ is_deleted: true })
          .where(eq(placeTable.source_id, googlePlaceId))

        // Track error in metrics
        metricsTimer.stop({ service: 'google_maps', endpoint: 'place_details' })
        externalApiRequestsCounter.inc({
          service: 'google_maps',
          endpoint: 'place_details',
          status_code: httpStatusCode,
        })

        throw new Error('PLACE_NOT_FOUND')
      }

      logger.error({
        msg: 'Google API Error Details',
        event: 'google_api_error',
        metadata: {
          errorData,
          googlePlaceId,
          statusCode: response.status,
        },
      })

      // Track error in metrics
      metricsTimer.stop({ service: 'google_maps', endpoint: 'place_details' })
      externalApiRequestsCounter.inc({
        service: 'google_maps',
        endpoint: 'place_details',
        status_code: httpStatusCode,
      })

      throw new Error(
        `Google API error: ${response.status} - ${JSON.stringify(errorData)}`,
      )
    }

    logger.info({
      msg: 'Google Place Details API call successful - BILLABLE REQUEST UNIT',
      event: 'google_place_details_api_billable',
      metadata: {
        googlePlaceId,
      },
    })

    // Track successful request
    metricsTimer.stop({ service: 'google_maps', endpoint: 'place_details' })
    externalApiRequestsCounter.inc({
      service: 'google_maps',
      endpoint: 'place_details',
      status_code: httpStatusCode,
    })

    return response.json()
  } catch (error) {
    // Track error if not already tracked above
    if (
      httpStatusCode === '500' &&
      !(error instanceof Error && error.message === 'PLACE_NOT_FOUND')
    ) {
      metricsTimer.stop({ service: 'google_maps', endpoint: 'place_details' })
      externalApiRequestsCounter.inc({
        service: 'google_maps',
        endpoint: 'place_details',
        status_code: httpStatusCode,
      })
    }
    throw error
  }
}

export async function getPlaceDetailsV1(
  params: { sourceId?: string; userPlaceId?: string },
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<PlaceBase & { fromCache: boolean; is_deleted?: boolean }> {
  const dbOrTx = tx ?? db
  const { sourceId, userPlaceId } = params

  if (sourceId && userPlaceId) {
    throw new Error('Only one of sourceId or userPlaceId should be provided')
  }

  let place: PlaceWithEnrichedAt

  if (userPlaceId) {
    place = await getPlaceByUserPlaceId(userPlaceId, dbOrTx)
  } else if (sourceId) {
    place = await getPlaceBySourceId(sourceId, dbOrTx)
  } else {
    throw new Error('Either sourceId or userPlaceId must be provided')
  }

  if (place.source_url != null && place.source_url !== '') {
    // If place is marked as deleted, never refresh it
    if (place.is_deleted) {
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
          age: getAge(place.updated_at.toISOString()),
        },
      })

      return {
        ...result,
        id: place.id,
        fromCache: true,
        is_deleted: place.is_deleted,
      }
    }

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
        placeSourceId: place.source_id,
        age: getAge(place.updated_at.toISOString()),
      },
    })

    return {
      ...result,
      id: place.id,
      fromCache: true,
      is_deleted: false,
    }
  }

  try {
    const googlePlaceId = place.source_id ?? sourceId
    const data = await enqueuePlaceDetailsJob(googlePlaceId)
    const validatedData = PreferredPlaceSchema.parse(sanitizeApiData(data))
    logger.info({
      msg: 'Enqueued place details job',
      event: 'place_details_job_enqueued',
      metadata: { data: JSON.stringify(data) },
    })

    const [updatedPlace] = await db
      .insert(placeTable)
      .values({
        source: 'google' as const,
        source_id: validatedData.id,
        source_url: validatedData.googleMapsUri,
        website: validatedData.websiteUri,
        name: validatedData.displayName?.text,
        location: validatedData.location,
        types: validatedData.types,
        primary_type: validatedData.primaryType,
        price_level: validatedData.priceLevel,
        price_range: validatedData.priceRange,
        rating: validatedData.rating,
        rating_count: validatedData.userRatingCount,
        phone: validatedData.internationalPhoneNumber,
        utc_offset_minutes: validatedData.utcOffsetMinutes,
        opening_hours: validatedData.regularOpeningHours,
        formatted_address: validatedData.formattedAddress,
        short_formatted_address: validatedData.shortFormattedAddress,
        country:
          validatedData.addressComponents?.find((component) =>
            component.types?.includes('country'),
          )?.longText || '',
        locality:
          validatedData.addressComponents?.find((component) =>
            component.types?.includes('locality'),
          )?.longText || '',
        sublocality:
          validatedData.addressComponents?.find((component) =>
            component.types?.includes('sublocality'),
          )?.longText || '',
        postal_code:
          validatedData.addressComponents?.find((component) =>
            component.types?.includes('postal_code'),
          )?.longText || '',
        postal_code_suffix:
          validatedData.addressComponents?.find((component) =>
            component.types?.includes('postal_code_suffix'),
          )?.longText || '',
        plus_code:
          validatedData.addressComponents?.find((component) =>
            component.types?.includes('plus_code'),
          )?.longText || '',
        street:
          validatedData.addressComponents?.find((component) =>
            component.types?.includes('route'),
          )?.longText || '',
        street_number:
          validatedData.addressComponents?.find((component) =>
            component.types?.includes('street_number'),
          )?.longText || '',
        neighborhood:
          validatedData.addressComponents?.find((component) =>
            component.types?.includes('neighborhood'),
          )?.longText || '',
        administrative_area_level_1:
          validatedData.addressComponents?.find((component) =>
            component.types?.includes('administrative_area_level_1'),
          )?.longText || '',
        administrative_area_level_2:
          validatedData.addressComponents?.find((component) =>
            component.types?.includes('administrative_area_level_2'),
          )?.longText || '',
        administrative_area_level_3:
          validatedData.addressComponents?.find((component) =>
            component.types?.includes('administrative_area_level_3'),
          )?.longText || '',
        reviews:
          validatedData.reviews?.map((review) => ({
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
        source_id: placeTable.source_id,
        source_url: placeTable.source_url,
        website: placeTable.website,
        name: placeTable.name,
        location: placeTable.location,
        types: placeTable.types,
        primary_type: placeTable.primary_type,
        price_level: placeTable.price_level,
        price_range: placeTable.price_range,
        rating: placeTable.rating,
        rating_count: placeTable.rating_count,
        phone: placeTable.phone,
        utc_offset_minutes: placeTable.utc_offset_minutes,
        opening_hours: placeTable.opening_hours,
        formatted_address: placeTable.formatted_address,
        short_formatted_address: placeTable.short_formatted_address,
        country: placeTable.country,
        locality: placeTable.locality,
        sublocality: placeTable.sublocality,
        postal_code: placeTable.postal_code,
        postal_code_suffix: placeTable.postal_code_suffix,
        plus_code: placeTable.plus_code,
        street: placeTable.street,
        street_number: placeTable.street_number,
        neighborhood: placeTable.neighborhood,
        administrative_area_level_1: placeTable.administrative_area_level_1,
        administrative_area_level_2: placeTable.administrative_area_level_2,
        administrative_area_level_3: placeTable.administrative_area_level_3,
        is_deleted: placeTable.is_deleted,
        reviews: placeTable.reviews,
        created_at: placeTable.created_at,
        updated_at: placeTable.updated_at,
      })
      .onConflictDoUpdate({
        target: placeTable.source_id,
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

    // Map the data for the response
    const result = mapToPlaceDetails(updatedPlace)

    logger.info({
      msg: 'Successfully fetched and cached fresh place data',
      event: 'place_details_fresh_data',
      metadata: { placeSourceId: place.source_id },
    })

    return { ...result, id: updatedPlace.id, fromCache: false }
  } catch (error) {
    logger.info({
      msg: 'Error fetching place details',
      event: 'place_details_fetch_error',
      metadata: { placeSourceId: place.source_id, error },
    })

    if (error instanceof Error && error.message === 'PLACE_NOT_FOUND') {
      await db
        .update(placeTable)
        .set({ is_deleted: true })
        .where(eq(placeTable.source_id, place.source_id))
      logger.info({
        msg: 'Marked existing place as deleted',
        event: 'place_details_marked_deleted',
        metadata: { placeSourceId: place.source_id },
      })
    }

    if (place.source_url != null && place.source_url !== '') {
      logger.info({
        msg: 'API failed, returning cached data as fallback',
        event: 'place_details_api_fallback',
        metadata: {
          placeSourceId: place.source_id,
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
        id: place.id,
        fromCache: true,
        is_deleted: place.is_deleted,
      }
    }

    // Re-throw error if no cached data available
    throw error
  }
}
