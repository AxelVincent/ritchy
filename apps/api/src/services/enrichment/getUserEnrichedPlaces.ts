import { eq, inArray } from 'drizzle-orm'
import { db } from '../../db/db'
import {
  enrichment as enrichmentTable,
  place,
  userPlace,
} from '../../db/schema'

export type EnrichmentLegacy = {
  website: string
  enrichmentId: string
  registeredAt: Date | null
  title: string | null
  description: string | null
}
export const getUserEnrichedPlaces = async (
  userPlaceIds: string[],
): Promise<Map<string, EnrichmentLegacy>> => {
  const enrichments = await db
    .select({
      placeId: place.sourceId,
      website: enrichmentTable.domain,
      enrichmentId: enrichmentTable.id,
      registeredAt: enrichmentTable.domainRegisteredAt,
      title: enrichmentTable.title,
      description: enrichmentTable.description,
      language: enrichmentTable.language,
      keywords: enrichmentTable.keywords,
      robots: enrichmentTable.robots,
    })
    .from(enrichmentTable)
    .innerJoin(place, eq(enrichmentTable.placeId, place.id))
    .innerJoin(userPlace, eq(place.id, userPlace.placeId))
    .where(inArray(userPlace.id, userPlaceIds))

  // Create a map of placeId -> website
  const placeToWebsite = new Map<string, EnrichmentLegacy>()
  for (const enrichment of enrichments) {
    placeToWebsite.set(enrichment.placeId, {
      website: enrichment.website ?? '',
      enrichmentId: enrichment.enrichmentId,
      registeredAt: enrichment.registeredAt,
      title: enrichment.title,
      description: enrichment.description,
    })
  }

  return placeToWebsite
}
