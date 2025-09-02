import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { status, userPlace } from '../../../../db/schema'

export const getPlacesStatus = (placeIds: string[], userId: string) =>
  db
    .select()
    .from(status)
    .innerJoin(userPlace, eq(status.userPlaceId, userPlace.id))
    .where(
      and(inArray(userPlace.place_id, placeIds), eq(userPlace.user_id, userId)),
    )
