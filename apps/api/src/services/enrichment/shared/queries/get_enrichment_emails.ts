import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import { type EnrichmentEmail, enrichmentEmail } from '../../../../db/schema'
import type * as schema from '../../../../db/schema'

export const getEnrichmentEmails = async (
  enrichmentId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<EnrichmentEmail[]> => {
  const dbOrTx = tx ?? db
  const emails = await dbOrTx
    .select()
    .from(enrichmentEmail)
    .where(eq(enrichmentEmail.enrichment_id, enrichmentId))

  return emails
}
