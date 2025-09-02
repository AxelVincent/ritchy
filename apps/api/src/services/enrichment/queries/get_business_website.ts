import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { place as placeTable, userPlace } from '../../../db/schema'
import type { PreferredPlace } from '../../../external/google_maps/types'
import { REDIS_KEYS } from '../../../internal/redis/keys'
import { redisClient } from '../../../internal/redis/redis'

export const getBusinessWebsite = async (userPlaceId: string) => {
  const [place] = await db
    .select()
    .from(userPlace)
    .innerJoin(placeTable, eq(userPlace.place_id, placeTable.id))
    .where(eq(userPlace.id, userPlaceId))
    .limit(1)

  if (!place) {
    return null
  }
  const key = REDIS_KEYS.place(place.place.source_id)
  const sourcePlace = await redisClient.get<PreferredPlace>(key)

  if (!sourcePlace) {
    return null
  }

  return sourcePlace.data.websiteUri
}
