import { eq, inArray } from 'drizzle-orm'
import { db } from '../../../db/db'
import { userPlace } from '../../../db/schema'

export const updateLastInteraction = async (
  userPlaceId: string,
): Promise<void> => {
  await db
    .update(userPlace)
    .set({ last_interaction_at: new Date() })
    .where(eq(userPlace.id, userPlaceId))
}

export const updateLastInteractionBatch = async (
  userPlaceIds: string[],
): Promise<void> => {
  if (userPlaceIds.length === 0) return
  await db
    .update(userPlace)
    .set({ last_interaction_at: new Date() })
    .where(inArray(userPlace.id, userPlaceIds))
}
