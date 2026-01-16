// Legacy: Full enrichment cost (company + all officers)
export const CREDIT_COST_PER_ENRICHMENT = 1
export const TEST_SIZE = 5

/**
 * Multi-worker architecture credit costs
 * @internal Currently unused - CREDIT_COST_PER_ENRICHMENT is used for legacy, CREDIT_COSTS for new system
 */
const _COMPANY_ENRICHMENT_CREDITS = 1

// Suppress unused variable warning
void _COMPANY_ENRICHMENT_CREDITS

/**
 * Per-result credit costs for contact enrichment
 * Users pay only for data found
 */
export const CREDIT_COSTS = {
  linkedin: 1,
  email: 1,
  phone: 4,
  maxContact: 6,
} as const

/**
 * @deprecated Use CREDIT_COSTS.maxContact instead
 * @internal Kept for backwards compatibility reference only
 */
const _CONTACT_ENRICHMENT_CREDITS = 5

// Suppress unused variable warning - deprecated constant
void _CONTACT_ENRICHMENT_CREDITS

export const ENRICHMENT_FEATURES = [
  'Comprehensive company profiles & descriptions',
  'LinkedIn, Twitter & social media presence',
  'Official government records & filings',
  'Financial data & company health metrics',
  'Decision-maker contacts: names, emails & phone numbers',
] as const

export const CONTACT_ENRICHMENT_FEATURES = [
  { name: 'LinkedIn profile', credits: CREDIT_COSTS.linkedin },
  { name: 'Email address', credits: CREDIT_COSTS.email, perItem: true },
  { name: 'Phone number', credits: CREDIT_COSTS.phone, perItem: true },
] as const
