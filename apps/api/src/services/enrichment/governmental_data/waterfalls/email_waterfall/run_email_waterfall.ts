import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../../../db/schema'
import { getCompanyWebsite } from '../../../queries/get_company_website'
import { getEnrichmentOfficerFullContext } from '../../../queries/get_enrichment_officer_full_context'
import type { InsertOfficerEmailData } from '../../../queries/insert_enrichment_company_officer_emails'
import { getMainDomain } from '../../../scraper/utils/get_main_domain'
import type { WaterfallResult } from '../../../types/error_handling'
import { validateOfficerForEnrichment } from '../../../utils/validate_officer'
import { enrichEmailCore } from './enrich_email_core'
import type { EmailWaterfallContext } from './index'

/**
 * Simple atomic email waterfall enrichment with comprehensive error handling
 * Fetches all required data internally - best for single-officer enrichment
 */
export const runEmailWaterfall = async (
  context: EmailWaterfallContext,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<WaterfallResult<InsertOfficerEmailData[]>> => {
  // Fetch officer data
  const officer = await getEnrichmentOfficerFullContext(context.officerId, tx)

  // Validate officer
  const validation = validateOfficerForEnrichment(officer, 'email')
  if (!validation.valid) {
    logger.debug({
      msg: '[email_waterfall_v2] Officer validation failed',
      event: 'email_waterfall_validation_failed',
      metadata: {
        officerId: context.officerId,
        reason: validation.reason,
      },
    })

    return {
      status: 'empty',
      reason: 'validation_failed',
      providersAttempted: [],
      details: `Officer validation failed: ${validation.reason}`,
    }
  }

  // Get company website for domain
  const website = await getCompanyWebsite(officer.company_id, tx)
  const domain = website ? getMainDomain(website) : null

  if (!domain) {
    logger.debug({
      msg: '[email_waterfall_v2] Skipping email enrichment due to missing domain',
      event: 'email_waterfall_no_domain',
      metadata: {
        officerId: context.officerId,
        companyId: officer.company_id,
        website,
      },
    })

    return {
      status: 'empty',
      reason: 'skipped',
      providersAttempted: [],
      details: 'No domain available for email search',
    }
  }

  // Run core enrichment logic
  return enrichEmailCore(validation.data, domain, tx)
}
