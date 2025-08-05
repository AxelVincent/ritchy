import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { userPlace } from '../../../db/schema'

export const setUserPlaceAsEnriched = async (userPlaceId: string) => {
  await db
    .update(userPlace)
    .set({ enrichedAt: new Date() })
    .where(eq(userPlace.id, userPlaceId))
}
