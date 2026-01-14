import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import { db } from '../../../../db/db'
import {
  enrichment as enrichmentTable,
  place,
  userPlace,
} from '../../../../db/schema'
import { PreferredPlaceSchema } from '../../../../external/google_maps/types'
import { upsertGooglePlace } from '../../../../external/google_maps/utils/upsert_place'
import { enqueuePlaceDetailsJob } from '../../../../internal/bullmq/jobs/google/places/queue'
import { sanitizeApiData } from '../../../../utils/sanitize_api_data'

export type CreateUserPlaceResult = {
  userPlaceId: string
  enrichmentId: string
  placeDbId: string
  isExisting: boolean
}

/**
 * Create or reuse a userPlace record for API enrichment
 *
 * Follows the same pattern as the web app:
 * 1. Find or create the place record by Google Place ID
 * 2. Check if user already has a userPlace for this place
 * 3. If exists, reuse it; otherwise create new
 * 4. Get or create enrichment record
 */
export const createUserPlaceForApi = async (
  userId: string,
  googlePlaceId: string,
): Promise<CreateUserPlaceResult> => {
  // 1. Find existing place by Google source_id
  const [existingPlace] = await db
    .select({ id: place.id, google_place_data: place.google_place_data })
    .from(place)
    .where(eq(place.source_id, googlePlaceId))
    .limit(1)

  let placeDbId: string

  if (existingPlace) {
    placeDbId = existingPlace.id

    // If google_place_data is missing (pre-migration data), refresh from Google
    if (!existingPlace.google_place_data) {
      logger.info({
        msg: 'Refreshing place data from Google - google_place_data is missing',
        event: 'api_place_data_refresh',
        metadata: { placeId: placeDbId, googlePlaceId },
      })

      const googleData = await enqueuePlaceDetailsJob(googlePlaceId)
      const validatedData = PreferredPlaceSchema.parse(
        sanitizeApiData(googleData),
      )
      await upsertGooglePlace(validatedData)
    }
  } else {
    // Fetch full place details from Google API before creating the record
    const googleData = await enqueuePlaceDetailsJob(googlePlaceId)
    const validatedData = PreferredPlaceSchema.parse(
      sanitizeApiData(googleData),
    )

    const newPlace = await upsertGooglePlace(validatedData)
    placeDbId = newPlace.id

    logger.info({
      msg: 'Created new place record with Google API data for API enrichment',
      event: 'api_place_created',
      metadata: {
        placeId: placeDbId,
        googlePlaceId,
        placeName: validatedData.displayName?.text,
      },
    })
  }

  // 2. Check if user already has a userPlace for this place
  const [existingUserPlace] = await db
    .select({ id: userPlace.id })
    .from(userPlace)
    .where(
      and(eq(userPlace.user_id, userId), eq(userPlace.place_id, placeDbId)),
    )
    .limit(1)

  let userPlaceId: string
  let isExisting = false

  if (existingUserPlace) {
    userPlaceId = existingUserPlace.id
    isExisting = true

    logger.info({
      msg: 'Reusing existing userPlace for API enrichment',
      event: 'api_user_place_reused',
      metadata: { userPlaceId, userId, googlePlaceId },
    })
  } else {
    // Create new userPlace
    const [newUserPlace] = await db
      .insert(userPlace)
      .values({
        user_id: userId,
        place_id: placeDbId,
      })
      .returning({ id: userPlace.id })

    userPlaceId = newUserPlace.id

    logger.info({
      msg: 'Created new userPlace for API enrichment',
      event: 'api_user_place_created',
      metadata: { userPlaceId, userId, googlePlaceId },
    })
  }

  // 3. Get or create enrichment record
  const [existingEnrichment] = await db
    .select({ id: enrichmentTable.id })
    .from(enrichmentTable)
    .where(eq(enrichmentTable.placeId, placeDbId))
    .limit(1)

  let enrichmentId: string

  if (existingEnrichment) {
    enrichmentId = existingEnrichment.id
  } else {
    const [newEnrichment] = await db
      .insert(enrichmentTable)
      .values({
        placeId: placeDbId,
        companyStatus: 'idle',
      })
      .returning({ id: enrichmentTable.id })

    enrichmentId = newEnrichment.id

    logger.info({
      msg: 'Created new enrichment record for API',
      event: 'api_enrichment_created',
      metadata: { enrichmentId, placeId: placeDbId },
    })
  }

  return {
    userPlaceId,
    enrichmentId,
    placeDbId,
    isExisting,
  }
}
