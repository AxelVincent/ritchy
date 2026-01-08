import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import {
  enrichmentCompany,
  enrichmentCompanyActivity,
  enrichmentCompanyOfficer,
} from '../../../../db/schema'
import type * as schema from '../../../../db/schema'

export const getEnrichmentCompanyByOfficerId = async (
  officerId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbInstance = tx || db

  const result = await dbInstance
    .select({
      id: enrichmentCompany.id,
      enrichment_id: enrichmentCompany.enrichment_id,
      name: enrichmentCompany.name,
      company_number: enrichmentCompany.company_number,
      status: enrichmentCompany.status,
      country_code: enrichmentCompany.country_code,
      head_office_city: enrichmentCompany.head_office_city,
      workforce: enrichmentCompany.workforce,
      workforce_range: enrichmentCompany.workforce_range,
      local_legal_form_name: enrichmentCompany.local_legal_form_name,
    })
    .from(enrichmentCompany)
    .innerJoin(
      enrichmentCompanyOfficer,
      eq(enrichmentCompany.id, enrichmentCompanyOfficer.company_id),
    )
    .where(eq(enrichmentCompanyOfficer.id, officerId))
    .limit(1)

  if (!result[0]) {
    return null
  }

  // Fetch activities separately
  const activities = await dbInstance
    .select({
      code: enrichmentCompanyActivity.code,
      name: enrichmentCompanyActivity.name,
    })
    .from(enrichmentCompanyActivity)
    .where(eq(enrichmentCompanyActivity.company_id, result[0].id))

  return {
    ...result[0],
    activities,
  }
}
