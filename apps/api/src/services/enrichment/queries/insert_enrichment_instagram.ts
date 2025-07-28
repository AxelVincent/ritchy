import { logger } from '@ritchy/logger'
import { DrizzleError } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichmentInstagram } from '../../../db/schema'

export const insertEnrichmentInstagram = async (
  enrichmentId: string,
  url: string,
) => {
  logger.info({
    msg: 'Inserting enrichment instagram',
    event: 'inserting_enrichment_instagram',
    metadata: { enrichmentId, url },
  })

  await db
    .insert(enrichmentInstagram)
    .values({
      enrichmentId,
      url,
    })
    .onConflictDoNothing()

  logger.info({
    msg: 'Enrichment instagram inserted',
    event: 'enrichment_instagram_inserted',
    metadata: { enrichmentId, url },
  })
}
