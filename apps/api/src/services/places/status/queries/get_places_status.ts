import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { status } from '../../../../db/schema'
import { getPlaceDetailsV1 } from '../../../../external/google_maps/place_details_V1'

export const getPlacesStatus = (placeIds: string[], userId: string) =>
  db
    .select()
    .from(status)
    .where(and(inArray(status.placeId, placeIds), eq(status.userId, userId)))
