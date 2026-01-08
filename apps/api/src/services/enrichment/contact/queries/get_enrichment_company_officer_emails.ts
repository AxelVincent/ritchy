import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import type * as schema from '../../../../db/schema'
import { enrichmentCompanyOfficerEmail } from '../../../../db/schema'

export const getEnrichmentCompanyOfficerEmails = async (
  officerId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db

  return await dbOrTx
    .select()
    .from(enrichmentCompanyOfficerEmail)
    .where(eq(enrichmentCompanyOfficerEmail.officer_id, officerId))
}
