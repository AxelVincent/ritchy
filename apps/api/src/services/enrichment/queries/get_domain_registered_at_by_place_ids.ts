import { logger } from '@ritchy/logger'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../../../db/db'
import {
  enrichment as enrichmentTable,
  place,
  userPlace,
} from '../../../db/schema'

export const getDomainRegisteredAtByPlaceIds = async (
  userPlaceIds: string[],
): Promise<Map<string, Date | null>> => {
  const domainRegisteredAt = await db
    .select({
      userPlaceId: userPlace.id,
      domainRegisteredAt: enrichmentTable.domainRegisteredAt,
    })
    .from(enrichmentTable)
    .innerJoin(place, eq(enrichmentTable.placeId, place.id))
    .innerJoin(userPlace, eq(place.id, userPlace.placeId))
    .where(inArray(userPlace.id, userPlaceIds))

  logger.info({
    msg: 'Domain registered at by place ids',
    event: 'domain_registered_at_by_place_ids',
    metadata: {
      userPlaceIds,
    },
  })

  const domainRegisteredAtMap = new Map<string, Date | null>()
  for (const enrichment of domainRegisteredAt) {
    domainRegisteredAtMap.set(
      enrichment.userPlaceId,
      enrichment.domainRegisteredAt,
    )
  }

  return domainRegisteredAtMap
}
