import type { CompanyEnrichmentData } from '@ritchy/types'
import { eq } from 'drizzle-orm'
import { db } from '../../../../db/db'
import {
  enrichmentCompany,
  enrichmentCompanyOfficer,
  enrichment as enrichmentTable,
  place,
  userPlace,
} from '../../../../db/schema'
import { getEnrichmentCompanyOfficers } from '../../contact/queries/get_enrichment_company_officers'
import { getEnrichmentEmails } from './get_enrichment_emails'
import { getEnrichmentFacebooks } from './get_enrichment_facebooks'
import { getEnrichmentInstagrams } from './get_enrichment_instagrams'
import { getEnrichmentLinkedins } from './get_enrichment_linkedins'
import { getEnrichmentPhones } from './get_enrichment_phones'
import { getEnrichmentTechnologies } from './get_enrichment_technologies'

/**
 * Get full company enrichment data for external API response
 * Aggregates all enrichment-related data into a single response object
 */
export const getFullCompanyEnrichmentData = async (
  userPlaceId: string,
): Promise<CompanyEnrichmentData | null> => {
  // Get base enrichment with company data
  const [enrichmentData] = await db
    .select({
      enrichment: enrichmentTable,
      company: enrichmentCompany,
      placeId: place.id,
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

  const { enrichment, company, placeId } = enrichmentData

  // Parallel fetch all related data
  const [
    technologies,
    linkedins,
    facebooks,
    instagrams,
    emails,
    phones,
    officers,
  ] = await Promise.all([
    getEnrichmentTechnologies(enrichment.id),
    getEnrichmentLinkedins(enrichment.id),
    getEnrichmentFacebooks(enrichment.id),
    getEnrichmentInstagrams(enrichment.id),
    getEnrichmentEmails(enrichment.id),
    getEnrichmentPhones(enrichment.id),
    company ? getEnrichmentCompanyOfficers(company.id) : Promise.resolve([]),
  ])

  return {
    enrichmentId: enrichment.id,
    placeId,

    // Website data
    domain: enrichment.domain,
    title: enrichment.title,
    description: enrichment.description,
    shortDescription: enrichment.shortDescription,
    domainRegisteredAt: enrichment.domainRegisteredAt?.toISOString() ?? null,
    score: enrichment.score,

    // Company data
    company: company
      ? {
          companyNumber: company.company_number,
          name: company.name,
          tradeName: company.trade_name,
          legalFormCode: company.legal_form_code,
          status: company.status,
          dateOfCreation: company.date_of_creation?.toISOString() ?? null,
          workforce: company.workforce,
          workforceRange: company.workforce_range,
          shareCapital: company.share_capital,
          confidenceScore: company.confidence_score,
          headOffice: company.head_office_address_line_1
            ? {
                addressLine1: company.head_office_address_line_1,
                addressLine2: company.head_office_address_line_2,
                city: company.head_office_city,
                postalCode: company.head_office_postal_code,
                country: company.head_office_country,
              }
            : null,
        }
      : null,

    // Officers
    officers: officers.map((o) => ({
      id: o.id,
      type: o.type,
      role: o.role,
      firstName: o.first_name,
      lastName: o.last_name,
      enrichmentStatus: o.enrichmentStatus ?? 'idle',
    })),

    // Technologies
    technologies: technologies.technologies,

    // Social links
    socialLinks: {
      linkedins: linkedins.map((l) => l.url),
      facebooks: facebooks.map((f) => f.url),
      instagrams: instagrams.map((i) => i.url),
    },

    // Emails
    emails: emails.map((e) => ({
      email: e.email,
      quality: e.quality,
      role: e.role,
      free: e.free,
    })),

    // Phones
    phones: phones.map((p) => ({
      phone: p.phone,
      type: p.type,
    })),

    // Credits used - to be calculated by service
    creditsUsed: 0,

    enrichedAt: enrichment.companyEnrichedAt?.toISOString() ?? null,
  }
}
