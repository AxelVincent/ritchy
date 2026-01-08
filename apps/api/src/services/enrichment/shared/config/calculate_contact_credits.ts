import { EMAIL_CREDITS, LINKEDIN_CREDITS, PHONE_CREDITS } from './constants'

export interface ContactEnrichmentResult {
  linkedinFound: boolean
  emailsFound: number
  phonesFound: number
}

export interface CreditsBreakdown {
  linkedin: number
  emails: number
  phones: number
  total: number
}

/**
 * Calculate credits based on enrichment results
 *
 * Pricing:
 * - LinkedIn: 0.5 credits (per profile)
 * - Email: 1 credit per email
 * - Phone: 4 credits per phone
 */
export const calculateContactCredits = (
  result: ContactEnrichmentResult,
): CreditsBreakdown => {
  const linkedin = result.linkedinFound ? LINKEDIN_CREDITS : 0
  const emails = EMAIL_CREDITS * result.emailsFound
  const phones = PHONE_CREDITS * result.phonesFound

  return {
    linkedin,
    emails,
    phones,
    total: linkedin + emails + phones,
  }
}
