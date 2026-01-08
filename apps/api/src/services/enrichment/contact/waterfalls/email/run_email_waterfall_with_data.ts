import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../../../db/schema'
import { getMainDomain } from '../../../company/scraper/utils/get_main_domain'
import type { WaterfallResult } from '../../../shared/types/error_handling'
import { validateOfficerForEnrichment } from '../../../shared/utils/validate_officer'
import type { InsertOfficerEmailData } from '../../queries/insert_enrichment_company_officer_emails'
import { enrichEmailCore } from './enrich_email_core'
import type { EmailWaterfallWithDataContext } from './index'

/**
 * Optimized email waterfall enrichment with pre-fetched data
 * Best for batch processing multiple officers - eliminates N+1 queries
 */
export const runEmailWaterfallWithData = async (
  context: EmailWaterfallWithDataContext,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<WaterfallResult<InsertOfficerEmailData[]>> => {
  // Validate officer (data already fetched)
  const validation = validateOfficerForEnrichment(context.officer, 'email')
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

  // Get domain from pre-fetched website
  const domain = context.website ? getMainDomain(context.website) : null

  if (!domain) {
    logger.debug({
      msg: '[email_waterfall_v2] Skipping email enrichment due to missing domain',
      event: 'email_waterfall_no_domain',
      metadata: {
        officerId: context.officerId,
        website: context.website,
      },
    })

    return {
      status: 'empty',
      reason: 'skipped',
      providersAttempted: [],
      details: 'No domain available for email search',
    }
  }

  // Run core enrichment logic with pre-fetched data
  return enrichEmailCore(validation.data, domain, tx)
}
