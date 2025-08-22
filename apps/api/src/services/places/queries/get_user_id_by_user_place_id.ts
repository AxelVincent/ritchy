import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { userPlace } from '../../../db/schema'

export const getUserIdByUserPlaceId = async (userPlaceId: string) => {
  const [user] = await db
    .select({
      id: userPlace.userId,
    })
    .from(userPlace)
    .where(eq(userPlace.id, userPlaceId))

  return user.id
}
