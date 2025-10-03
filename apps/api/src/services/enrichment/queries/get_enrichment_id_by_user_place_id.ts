import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import {
  enrichment as enrichmentTable,
  place,
  userPlace,
} from '../../../db/schema'

export const getEnrichmentIdByUserPlaceId = async (userPlaceId: string) => {
  const [enrichment] = await db
    .select({ id: enrichmentTable.id })
    .from(enrichmentTable)
    .innerJoin(place, eq(enrichmentTable.placeId, place.id))
    .innerJoin(userPlace, eq(enrichmentTable.placeId, userPlace.id))
    .where(eq(userPlace.id, userPlaceId))
    .limit(1)

  return enrichment
}
