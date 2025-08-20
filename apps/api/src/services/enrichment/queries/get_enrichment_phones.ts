import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { enrichmentPhone } from '../../../db/schema'
import type * as schema from '../../../db/schema'

export const getEnrichmentPhones = async (
  enrichmentId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db
  const phones = await dbOrTx
    .select()
    .from(enrichmentPhone)
    .where(eq(enrichmentPhone.enrichmentId, enrichmentId))

  return phones
}
