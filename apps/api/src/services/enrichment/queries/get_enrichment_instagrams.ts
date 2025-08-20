import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { enrichmentInstagram } from '../../../db/schema'
import type * as schema from '../../../db/schema'

export const getEnrichmentInstagrams = async (
  enrichmentId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db
  const instagram = await dbOrTx
    .select()
    .from(enrichmentInstagram)
    .where(eq(enrichmentInstagram.enrichmentId, enrichmentId))

  return instagram
}
