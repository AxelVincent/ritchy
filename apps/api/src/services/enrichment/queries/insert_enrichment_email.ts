import { logger } from '@ritchy/logger'
import { DrizzleError } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichmentEmail } from '../../../db/schema/enrichment'

export const insertEnrichmentEmail = async (
  enrichmentId: string,
  email: string,
): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim()

  await db
    .insert(enrichmentEmail)
    .values({
      enrichmentId,
      email: normalizedEmail,
    })
    .onConflictDoNothing()

  logger.info({
    msg: 'Enrichment email inserted',
    event: 'enrichment_email_inserted',
    metadata: { enrichmentId, email: normalizedEmail },
  })
}
