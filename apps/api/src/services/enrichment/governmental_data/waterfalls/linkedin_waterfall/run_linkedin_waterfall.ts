import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../../../db/schema'
import { getEnrichmentCompanyByOfficerId } from '../../../queries/get_enrichment_company_by_officer_id'
import { getEnrichmentOfficerFullContext } from '../../../queries/get_enrichment_officer_full_context'
import type {
  ActivityData,
  CompanyContextData,
  PlaceContextData,
} from '../../../queries/get_officers_enrichment_context'
import { validateOfficerForEnrichment } from '../../../utils/validate_officer'
import { enrichLinkedInCore } from './enrich_linkedin_core'
import type { LinkedInWaterfallContext, LinkedInWaterfallResult } from './index'

/**
 * Simple atomic LinkedIn waterfall enrichment
 * Fetches all required data internally - best for single-officer enrichment
 *
 * @param context - Context with only officerId
 * @param tx - Optional database transaction
 * @returns Enrichment result
 */
export const runLinkedInWaterfall = async (
  context: LinkedInWaterfallContext,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<LinkedInWaterfallResult> => {
  // Fetch officer data
  const officer = await getEnrichmentOfficerFullContext(context.officerId, tx)

  // Validate officer
  const validation = validateOfficerForEnrichment(officer, 'linkedin')
  if (!validation.valid) {
    return { success: false }
  }

  // Fetch company context
  const companyData = await getEnrichmentCompanyByOfficerId(
    context.officerId,
    tx,
  )

  if (!companyData) {
    logger.warn({
      msg: '[linkedin_waterfall] No company context found',
      event: 'linkedin_waterfall_no_company',
      metadata: { officerId: context.officerId },
    })
    return { success: false }
  }

  // Fetch place context (simplified - using existing data from company)
  const placeData: PlaceContextData = {
    id: '',
    source_id: '',
    source: 'google' as const,
    source_url: null,
    website: null,
    name: companyData.name,
    location: null,
    types: null,
    primary_type: null,
    formatted_address: null,
    short_formatted_address: null,
    country: companyData.country_code,
    locality: companyData.head_office_city,
    sublocality: null,
    postal_code: null,
    postal_code_suffix: null,
    plus_code: null,
    street: null,
    street_number: null,
    neighborhood: null,
    administrative_area_level_1: null,
    administrative_area_level_2: null,
    administrative_area_level_3: null,
    phone: null,
    rating: null,
    rating_count: null,
    price_level: null,
    price_range: null,
    utc_offset_minutes: null,
    opening_hours: null,
    reviews: null,
    is_deleted: false,
    created_at: new Date(),
    updated_at: new Date(),
  }

  const company: CompanyContextData & { activities: ActivityData[] } = {
    ...companyData,
    activities: companyData.activities || [],
  }

  // Run core enrichment logic
  return enrichLinkedInCore(validation.data, company, placeData, tx)
}
