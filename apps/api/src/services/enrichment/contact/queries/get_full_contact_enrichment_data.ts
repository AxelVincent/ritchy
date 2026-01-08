import type { ContactEnrichmentData } from '@ritchy/types'
import { getEnrichmentCompanyOfficerEmails } from './get_enrichment_company_officer_emails'
import { getEnrichmentCompanyOfficerLinkedin } from './get_enrichment_company_officer_linkedin'
import { getEnrichmentCompanyOfficerPhones } from './get_enrichment_company_officer_phones'

/**
 * Get full contact enrichment data for external API response
 * Aggregates LinkedIn, emails, and phones for a company officer
 */
export const getFullContactEnrichmentData = async (
  officerId: string,
  contactId: string,
): Promise<ContactEnrichmentData | null> => {
  // Parallel fetch all contact data
  const [linkedin, emails, phones] = await Promise.all([
    getEnrichmentCompanyOfficerLinkedin(officerId),
    getEnrichmentCompanyOfficerEmails(officerId),
    getEnrichmentCompanyOfficerPhones(officerId),
  ])

  // If no data found at all, return null
  if (!linkedin && emails.length === 0 && phones.length === 0) {
    return null
  }

  return {
    contactId,
    officerId,

    // LinkedIn profile
    linkedin: linkedin
      ? {
          profileUrl: linkedin.profile_url,
          confidence: linkedin.confidence,
          reasoning: linkedin.reasoning,
          source: linkedin.source,
        }
      : null,

    // Emails
    emails: emails.map((e) => ({
      email: e.email,
      isVerified: e.is_verified,
      quality: e.quality,
      role: e.role,
      free: e.free,
      source: e.source,
    })),

    // Phones
    phones: phones.map((p) => ({
      phone: p.phone,
      source: p.source,
    })),

    // Credits - to be calculated by service
    credits: {
      used: 0,
      breakdown: {
        linkedin: 0,
        emails: 0,
        phones: 0,
      },
    },

    enrichedAt: linkedin?.createdAt?.toISOString() ?? null,
  }
}
