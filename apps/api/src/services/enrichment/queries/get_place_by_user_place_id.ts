import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { place as placeTable, userPlace } from '../../../db/schema'

export const getPlaceByUserPlaceId = async (userPlaceId: string) => {
  const [place] = await db
    .select()
    .from(placeTable)
    .innerJoin(userPlace, eq(placeTable.id, userPlace.place_id))
    .where(eq(userPlace.id, userPlaceId))
    .limit(1)

  return place
}
