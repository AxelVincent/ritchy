import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { enrichmentFacebook } from '../../../db/schema'
import type * as schema from '../../../db/schema'

export const getEnrichmentFacebooks = async (
  enrichmentId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db

  const facebook = await dbOrTx
    .select()
    .from(enrichmentFacebook)
    .where(eq(enrichmentFacebook.enrichmentId, enrichmentId))

  return facebook
}
