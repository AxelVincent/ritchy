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
  logger.debug({
    msg: 'Getting place from enrichment',
    event: 'getting_place_from_enrichment',
    metadata: { place },
  })
  const key = REDIS_KEYS.place(place.place.source_id)
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
