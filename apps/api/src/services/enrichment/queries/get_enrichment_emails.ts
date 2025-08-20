import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { enrichmentEmail } from '../../../db/schema'
import type * as schema from '../../../db/schema'

export const getEnrichmentEmails = async (
  enrichmentId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db
  const emails = await dbOrTx
    .select()
    .from(enrichmentEmail)
    .where(eq(enrichmentEmail.enrichmentId, enrichmentId))

  return emails
}
