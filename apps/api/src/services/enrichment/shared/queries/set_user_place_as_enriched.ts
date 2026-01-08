import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { userPlace } from '../../../../db/schema'

export const setUserPlaceAsEnriched = async (userPlaceId: string) => {
  try {
    const now = new Date()
    await db
      .update(userPlace)
      .set({ enriched_at: now, last_interaction_at: now })
      .where(eq(userPlace.id, userPlaceId))
  } catch (error) {
    logger.error({
      msg: 'Failed to set user place as enriched',
      event: 'failed_to_set_user_place_as_enriched',
      metadata: { userPlaceId, error },
    })
    throw error
  }
}
