import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import type * as schema from '../../../../db/schema'
import { enrichmentCompanyOfficerPhone } from '../../../../db/schema'

export const getEnrichmentCompanyOfficerPhones = async (
  officerId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db

  return await dbOrTx
    .select()
    .from(enrichmentCompanyOfficerPhone)
    .where(eq(enrichmentCompanyOfficerPhone.officer_id, officerId))
}
