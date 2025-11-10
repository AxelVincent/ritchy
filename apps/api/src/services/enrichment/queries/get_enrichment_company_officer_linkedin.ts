import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import { enrichmentCompanyOfficerLinkedin } from '../../../db/schema/enrichment'

export const getEnrichmentCompanyOfficerLinkedin = async (
  officerId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const database = tx || db

  const result = await database
    .select()
    .from(enrichmentCompanyOfficerLinkedin)
    .where(eq(enrichmentCompanyOfficerLinkedin.officer_id, officerId))
    .limit(1)

  return result[0] || null
}
