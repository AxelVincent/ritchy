import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import type * as schema from '../../../../db/schema'
import {
  contact,
  enrichmentCompany,
  enrichmentCompanyActivity,
  enrichmentCompanyOfficer,
  place,
  userPlace,
} from '../../../../db/schema'

export interface OfficerEnrichmentContext {
  contact: {
    id: string
    firstName: string | null
    lastName: string | null
    enrichmentStatus: string | null
  }
  officer: {
    id: string
    company_id: string
    type: 'physical' | 'legal' | null
    first_name: string | null
    last_name: string | null
    role: string | null
    date_of_appointment: Date | null
    date_of_birth: Date | null
    gender: string | null
    nationality: string | null
    address_line_1: string | null
    city: string | null
    country: string | null
  }
  company: {
    id: string
    name: string | null
    company_number: string | null
    status: string | null
    country_code: string | null
    head_office_city: string | null
    workforce: number | null
    workforce_range: string | null
    local_legal_form_name: string | null
    activities: Array<{ code: string | null; name: string | null }>
  }
  place: {
    website: string | null
    name: string | null
  }
  userPlaceId: string
}

/**
 * Get enrichment context for an officer-based contact.
 * Returns null if contact doesn't have an officerId.
 */
export const getOfficerEnrichmentContext = async (
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<OfficerEnrichmentContext | null> => {
  const database = tx ?? db

  // Get contact with place data
  const result = await database
    .select({
      contact: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        officerId: contact.officerId,
        enrichmentStatus: contact.enrichmentStatus,
      },
      userPlaceId: userPlace.id,
      place: {
        website: place.website,
        name: place.name,
      },
    })
    .from(contact)
    .innerJoin(userPlace, eq(userPlace.id, contact.userPlaceId))
    .innerJoin(place, eq(place.id, userPlace.place_id))
    .where(eq(contact.id, contactId))
    .limit(1)

  if (!result.length || !result[0].contact.officerId) {
    return null // Not an officer contact
  }

  const row = result[0]

  // Get officer and company data
  const officerResult = await database
    .select({
      officer: {
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
      },
      company: {
        id: enrichmentCompany.id,
        name: enrichmentCompany.name,
        company_number: enrichmentCompany.company_number,
        status: enrichmentCompany.status,
        country_code: enrichmentCompany.country_code,
        head_office_city: enrichmentCompany.head_office_city,
        workforce: enrichmentCompany.workforce,
        workforce_range: enrichmentCompany.workforce_range,
        local_legal_form_name: enrichmentCompany.local_legal_form_name,
      },
    })
    .from(enrichmentCompanyOfficer)
    .innerJoin(
      enrichmentCompany,
      eq(enrichmentCompany.id, enrichmentCompanyOfficer.company_id),
    )
    .where(eq(enrichmentCompanyOfficer.id, row.contact.officerId as string))
    .limit(1)

  if (!officerResult.length) {
    return null
  }

  // Get company activities
  const activities = await database
    .select({
      code: enrichmentCompanyActivity.code,
      name: enrichmentCompanyActivity.name,
    })
    .from(enrichmentCompanyActivity)
    .where(
      eq(enrichmentCompanyActivity.company_id, officerResult[0].company.id),
    )

  return {
    contact: {
      id: row.contact.id,
      firstName: row.contact.firstName,
      lastName: row.contact.lastName,
      enrichmentStatus: row.contact.enrichmentStatus,
    },
    officer: officerResult[0].officer,
    company: {
      ...officerResult[0].company,
      activities,
    },
    place: row.place,
    userPlaceId: row.userPlaceId,
  }
}
