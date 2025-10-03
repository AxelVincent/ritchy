import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import {
  enrichmentCompany,
  enrichmentCompanyActivity,
  enrichmentCompanyContact,
  enrichmentCompanyEstablishment,
  enrichmentCompanyFinancial,
  enrichmentCompanyOfficer,
  enrichmentCompanyUbo,
  enrichment as enrichmentTable,
  place,
  userPlace,
} from '../../../db/schema'

export const getEnrichmentByUserPlaceId = async (userPlaceId: string) => {
  // First, get the basic enrichment and company data
  const [enrichmentData] = await db
    .select({
      enrichment: enrichmentTable,
      company: enrichmentCompany,
    })
    .from(enrichmentTable)
    .innerJoin(place, eq(enrichmentTable.placeId, place.id))
    .innerJoin(userPlace, eq(userPlace.place_id, place.id))
    .leftJoin(
      enrichmentCompany,
      eq(enrichmentTable.id, enrichmentCompany.enrichment_id),
    )
    .where(eq(userPlace.id, userPlaceId))
    .limit(1)

  if (!enrichmentData) {
    return null
  }

  // If there's no company data, return early with just enrichment
  if (!enrichmentData.company) {
    return {
      enrichment: enrichmentData.enrichment,
      company: null,
      activities: [],
      contacts: [],
      establishments: [],
      officers: [],
      ubos: [],
    }
  }

  // Get all related records for the company
  const [activities, contacts, establishments, officers, ubos, financials] =
    await Promise.all([
      db
        .select()
        .from(enrichmentCompanyActivity)
        .where(
          eq(enrichmentCompanyActivity.company_id, enrichmentData.company.id),
        ),

      db
        .select()
        .from(enrichmentCompanyContact)
        .where(
          eq(enrichmentCompanyContact.company_id, enrichmentData.company.id),
        ),

      db
        .select()
        .from(enrichmentCompanyEstablishment)
        .where(
          eq(
            enrichmentCompanyEstablishment.company_id,
            enrichmentData.company.id,
          ),
        ),

      db
        .select()
        .from(enrichmentCompanyOfficer)
        .where(
          eq(enrichmentCompanyOfficer.company_id, enrichmentData.company.id),
        ),

      db
        .select()
        .from(enrichmentCompanyUbo)
        .where(eq(enrichmentCompanyUbo.company_id, enrichmentData.company.id)),

      db
        .select()
        .from(enrichmentCompanyFinancial)
        .where(
          eq(enrichmentCompanyFinancial.company_id, enrichmentData.company.id),
        ),
    ])

  return {
    enrichment: enrichmentData.enrichment,
    company: enrichmentData.company,
    activities,
    contacts,
    establishments,
    officers,
    ubos,
    financials,
  }
}
