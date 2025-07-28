import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import {
  enrichment as enrichmentTable,
  place as placeTable,
} from '../../../db/schema'
import type { PreferredPlace } from '../../../external/google_maps/types'
import { REDIS_KEYS } from '../../../internal/redis/keys'
import { redisClient } from '../../../internal/redis/redis'

export const getBusinessCountryCodeByEnrichmentId = async (
  enrichmentId: string,
) => {
  const [place] = await db
    .select()
    .from(enrichmentTable)
    .innerJoin(placeTable, eq(enrichmentTable.placeId, placeTable.id))
    .where(eq(enrichmentTable.id, enrichmentId))
    .limit(1)

  if (!place) {
    return null
  }
  const key = REDIS_KEYS.place(place.place.sourceId)
  const sourcePlace = await redisClient.get<PreferredPlace>(key)

  if (!sourcePlace) {
    return null
  }

  return (
    sourcePlace.data.addressComponents?.find((component) =>
      component.types?.includes('country'),
    )?.shortText ?? null
  )
}
