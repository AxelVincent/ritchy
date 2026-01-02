import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import {
  enrichment,
  enrichmentCompany,
  enrichmentCompanyActivity,
  enrichmentCompanyOfficer,
  place,
  userPlace,
} from '../../../db/schema'
import type {
  ActivityData,
  CompanyContextData,
  OfficerData,
  PlaceContextData,
} from './get_officers_enrichment_context'

/**
 * Full context for officer enrichment service
 */
export interface OfficerServiceContext {
  officer: OfficerData
  company: CompanyContextData & { activities: ActivityData[] }
  place: PlaceContextData
  userPlaceId: string
}

/**
 * Get full context needed for officer enrichment service.
 * This query fetches officer, company, place data in minimal queries.
 *
 * Uses the same types as getOfficersEnrichmentContext to ensure compatibility
 * with existing waterfalls.
 *
 * @param officerId - The officer ID to fetch context for
 * @param tx - Optional database transaction
 * @returns Full context or null if officer not found
 */
export const getOfficerServiceContext = async (
  officerId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<OfficerServiceContext | null> => {
  const database = tx ?? db

  // Query 1: Get officer data
  const officerResult = await database
    .select({
      id: enrichmentCompanyOfficer.id,
      company_id: enrichmentCompanyOfficer.company_id,
      type: enrichmentCompanyOfficer.type,
      first_name: enrichmentCompanyOfficer.first_name,
      last_name: enrichmentCompanyOfficer.last_name,
      role: enrichmentCompanyOfficer.role,
      date_of_appointment: enrichmentCompanyOfficer.date_of_appointment,
      date_of_birth: enrichmentCompanyOfficer.date_of_birth,
      gender: enrichmentCompanyOfficer.gender,
      nationality: enrichmentCompanyOfficer.nationality,
      address_line_1: enrichmentCompanyOfficer.address_line_1,
      city: enrichmentCompanyOfficer.city,
      country: enrichmentCompanyOfficer.country,
    })
    .from(enrichmentCompanyOfficer)
    .where(eq(enrichmentCompanyOfficer.id, officerId))
    .limit(1)

  if (!officerResult.length) {
    return null
  }

  const officer = officerResult[0]

  // Query 2: Get company with enrichment and place data
  const companyResult = await database
    .select({
      // Company fields
      company_id: enrichmentCompany.id,
      company_enrichment_id: enrichmentCompany.enrichment_id,
      company_name: enrichmentCompany.name,
      company_number: enrichmentCompany.company_number,
      company_status: enrichmentCompany.status,
      company_country_code: enrichmentCompany.country_code,
      company_head_office_city: enrichmentCompany.head_office_city,
      company_workforce: enrichmentCompany.workforce,
      company_workforce_range: enrichmentCompany.workforce_range,
      company_local_legal_form_name: enrichmentCompany.local_legal_form_name,
      // Place (full record)
      place: place,
      // UserPlace ID
      userPlaceId: userPlace.id,
    })
    .from(enrichmentCompany)
    .innerJoin(enrichment, eq(enrichment.id, enrichmentCompany.enrichment_id))
    .innerJoin(place, eq(place.id, enrichment.placeId))
    .innerJoin(userPlace, eq(userPlace.place_id, enrichment.placeId))
    .where(eq(enrichmentCompany.id, officer.company_id))
    .limit(1)

  if (!companyResult.length) {
    return null
  }

  const row = companyResult[0]

  // Query 3: Get company activities
  const activities = await database
    .select({
      code: enrichmentCompanyActivity.code,
      name: enrichmentCompanyActivity.name,
    })
    .from(enrichmentCompanyActivity)
    .where(eq(enrichmentCompanyActivity.company_id, officer.company_id))

  return {
    officer,
    company: {
      id: row.company_id,
      enrichment_id: row.company_enrichment_id,
      name: row.company_name,
      company_number: row.company_number,
      status: row.company_status,
      country_code: row.company_country_code,
      head_office_city: row.company_head_office_city,
      workforce: row.company_workforce,
      workforce_range: row.company_workforce_range,
      local_legal_form_name: row.company_local_legal_form_name,
      activities,
    },
    place: row.place,
    userPlaceId: row.userPlaceId,
  }
}
