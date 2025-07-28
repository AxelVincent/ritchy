import { logger } from '@ritchy/logger'
import { DrizzleError } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichmentLinkedin } from '../../../db/schema'

export const insertEnrichmentLinkedin = async (
  enrichmentId: string,
  url: string,
) => {
  logger.info({
    msg: 'Inserting enrichment linkedin',
    event: 'inserting_enrichment_linkedin',
    metadata: { enrichmentId, url },
  })

  await db
    .insert(enrichmentLinkedin)
    .values({
      enrichmentId,
      url,
    })
    .onConflictDoNothing()

  logger.info({
    msg: 'Enrichment linkedin inserted',
    event: 'enrichment_linkedin_inserted',
    metadata: { enrichmentId, url },
  })
}
