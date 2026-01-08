import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import { enrichmentCompanyOfficer } from '../../../../db/schema'
import type * as schema from '../../../../db/schema'

export const getEnrichmentCompanyOfficers = async (
  companyId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db
  const officers = await dbOrTx
    .select()
    .from(enrichmentCompanyOfficer)
    .where(eq(enrichmentCompanyOfficer.company_id, companyId))

  return officers
}
