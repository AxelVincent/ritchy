/**
 * Enrichment credit costs
 *
 * Single source of truth for credit consumption and refunds.
 */

/** Company enrichment: website scraping, company data, officers list */
export const COMPANY_CREDITS = 1

/** Officer enrichment: LinkedIn, email, phone lookup for company officers */
export const OFFICER_CREDITS = 5

/**
 * Per-result credit costs for contact enrichment
 * Users pay only for data found
 */
export const PHONE_CREDITS = 4
export const LINKEDIN_CREDITS = 1
export const EMAIL_CREDITS = 1

/**
 * Maximum credits to reserve upfront for contact enrichment
 * Assumes 1 LinkedIn + 1 email + 1 phone = 1 + 1 + 4 = 6
 */
export const MAX_CONTACT_CREDITS = 6

/**
 * @deprecated Use MAX_CONTACT_CREDITS and per-result credits instead
 * @internal Kept for backwards compatibility reference only - not exported
 */
const _CONTACT_CREDITS = 5

// Suppress unused variable warning - deprecated constant kept for reference
void _CONTACT_CREDITS
