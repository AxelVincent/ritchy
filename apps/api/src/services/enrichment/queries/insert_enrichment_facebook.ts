import { logger } from '@ritchy/logger'
import { DrizzleError } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichmentFacebook } from '../../../db/schema'

export const insertEnrichmentFacebook = async (
  enrichmentId: string,
  url: string,
) => {
  logger.info({
    msg: 'Inserting enrichment facebook',
    event: 'inserting_enrichment_facebook',
    metadata: { enrichmentId, url },
  })

  await db
    .insert(enrichmentFacebook)
    .values({
      enrichmentId,
      url,
    })
    .onConflictDoNothing()

  logger.info({
    msg: 'Enrichment facebook inserted',
    event: 'enrichment_facebook_inserted',
    metadata: { enrichmentId, url },
  })
}
