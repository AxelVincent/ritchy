import { logger } from '@ritchy/logger'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../../../db/db'
import {
  enrichment as enrichmentTable,
  place,
  userPlace,
} from '../../../db/schema'

type Enrichment = {
  domainRegisteredAt: Date | null
  description: string | null
  shortDescription: string | null
  enrichedAt: Date | null
}

export const getEnrichmentByPlaceIds = async (
  userPlaceIds: string[],
): Promise<Map<string, Enrichment>> => {
  const enrichments = await db
    .select({
      userPlaceId: userPlace.id,
      domainRegisteredAt: enrichmentTable.domainRegisteredAt,
      description: enrichmentTable.description,
      shortDescription: enrichmentTable.shortDescription,
      enrichedAt: userPlace.enrichedAt,
    })
    .from(enrichmentTable)
    .innerJoin(place, eq(enrichmentTable.placeId, place.id))
    .innerJoin(userPlace, eq(place.id, userPlace.placeId))
    .where(inArray(userPlace.id, userPlaceIds))

  logger.info({
    msg: 'Enrichment by place ids',
    event: 'enrichment_by_place_ids',
    metadata: {
      userPlaceIds,
    },
  })

  const enrichmentMap = new Map<string, Enrichment>()
  for (const enrichment of enrichments) {
    enrichmentMap.set(enrichment.userPlaceId, {
      domainRegisteredAt: enrichment.domainRegisteredAt,
      description: enrichment.description,
      shortDescription: enrichment.shortDescription,
      enrichedAt: enrichment.enrichedAt,
    })
  }

  return enrichmentMap
}
