import { logger } from '@ritchy/logger'
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
  logger.debug({
    msg: 'Getting business country code by enrichment id',
    event: 'getting_business_country_code_by_enrichment_id',
    metadata: { enrichmentId },
  })
  const [place] = await db
    .select()
    .from(enrichmentTable)
    .innerJoin(placeTable, eq(enrichmentTable.placeId, placeTable.id))
    .where(eq(enrichmentTable.id, enrichmentId))
    .limit(1)

  if (!place) {
    return null
  }
  return place.place.country
}
