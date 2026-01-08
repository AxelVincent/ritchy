import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import type * as schema from '../../../../db/schema'
import { enrichmentCompanyOfficer } from '../../../../db/schema/enrichment'

/**
 * Get full officer data with all fields needed for enrichment
 */
export const getEnrichmentOfficerFullContext = async (
  officerId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const database = tx || db
  const result = await database
    .select()
    .from(enrichmentCompanyOfficer)
    .where(eq(enrichmentCompanyOfficer.id, officerId))
    .limit(1)

  return result[0] || null
}
