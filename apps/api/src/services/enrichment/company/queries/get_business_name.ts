import { eq } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { place as placeTable, userPlace } from '../../../../db/schema'

export const getBusinessName = async (userPlaceId: string) => {
  const [place] = await db
    .select()
    .from(userPlace)
    .innerJoin(placeTable, eq(userPlace.place_id, placeTable.id))
    .where(eq(userPlace.id, userPlaceId))
    .limit(1)

  if (!place) {
    return null
  }

  return place.place.name
}
