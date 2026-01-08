import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import { enrichmentLinkedin } from '../../../../db/schema'
import type * as schema from '../../../../db/schema'

export const getEnrichmentLinkedins = async (
  enrichmentId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db
  const linkedin = await dbOrTx
    .select()
    .from(enrichmentLinkedin)
    .where(eq(enrichmentLinkedin.enrichmentId, enrichmentId))

  return linkedin
}
