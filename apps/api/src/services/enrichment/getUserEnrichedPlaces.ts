import { eq, inArray } from 'drizzle-orm'
import { db } from '../../db/db'
import {
  enrichment as enrichmentTable,
  place,
  userPlace
} from '../../db/schema'

export const getUserEnrichedPlaces = async (
  userPlaceIds: string[]
): Promise<Map<string, string>> => {
  const enrichments = await db
    .select({
      placeId: place.sourceId,
      website: enrichmentTable.domain
    })
    .from(enrichmentTable)
    .innerJoin(place, eq(enrichmentTable.placeId, place.id))
    .innerJoin(userPlace, eq(place.id, userPlace.placeId))
    .where(inArray(userPlace.id, userPlaceIds))

  // Create a map of placeId -> website
  const placeToWebsite = new Map<string, string>()
  for (const enrichment of enrichments) {
    placeToWebsite.set(enrichment.placeId, enrichment.website)
  }

  return placeToWebsite
}
