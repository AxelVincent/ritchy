import 'dotenv/config'
import { logger } from '@ritchy/logger'

import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'
import type { PlaceBase } from '../../shared'

import { eq } from 'drizzle-orm'
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
import { upsertGooglePlace } from './utils/upsert_place'

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

    const updatedPlace = await upsertGooglePlace(validatedData)

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
