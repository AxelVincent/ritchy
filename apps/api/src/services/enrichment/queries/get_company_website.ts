import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import { enrichmentCompanyContact } from '../../../db/schema/enrichment'

/**
 * Get company website from enrichment_company_contact
 */
export const getCompanyWebsite = async (
  companyId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<string | null> => {
  const database = tx || db
  const result = await database
    .select()
    .from(enrichmentCompanyContact)
    .where(
      and(
        eq(enrichmentCompanyContact.company_id, companyId),
        eq(enrichmentCompanyContact.type, 'website'),
      ),
    )
    .limit(1)

  return result[0]?.value || null
}
