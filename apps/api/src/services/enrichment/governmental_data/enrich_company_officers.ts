import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../db/schema'
import { getOfficersEnrichmentContext } from '../queries/get_officers_enrichment_context'
import {
  runEmailWaterfallWithData,
  runLinkedInWaterfallWithData,
  runPhoneWaterfall,
} from './waterfalls'

/**
 * Business logic service to enrich company officers with LinkedIn profile, email, and phone data
 * This function orchestrates three independent waterfall enrichments in sequence:
 * 1. LinkedIn profile enrichment (with LLM-powered matching)
 * 2. Email enrichment (work + personal emails)
 * 3. Phone number enrichment (personal phones)
 *
 * **Optimization Strategy:**
 * - Uses batch query to fetch all officer, company, and place data in 2 queries (not 18)
 * - For 3 officers: reduces 18 queries to 2 queries (89% reduction)
 * - Each waterfall receives pre-fetched data to eliminate N+1 queries
 * - External API calls are made via BullMQ queues for proper rate limiting
 *
 * @param companyId - The company ID to get officers from
 * @param tx - Optional database transaction
 */
export const enrichCompanyOfficers = async (
  companyId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<void> => {
  // Fetch ALL officer contexts in 2 queries (batch optimization)
  const officersContext = await getOfficersEnrichmentContext(companyId, tx)

  if (!officersContext?.officers.length) {
    return
  }

  logger.info({
    msg: '[enrich_company_officers] Starting officer enrichment',
    event: 'officer_enrichment_start',
    metadata: {
      companyId,
      officersCount: officersContext.officers.length,
    },
  })

  // Process officers sequentially to avoid rate limiting
  for (const officer of officersContext.officers) {
    try {
      // Run LinkedIn Waterfall (Priority 1) with pre-fetched data
      await runLinkedInWaterfallWithData(
        {
          officerId: officer.id,
          officer: officer,
          company: {
            ...officersContext.company,
            activities: officersContext.activities,
          },
          place: officersContext.place,
        },
        tx,
      )

      // Run Email Waterfall (Priority 2) with pre-fetched data
      await runEmailWaterfallWithData(
        {
          officerId: officer.id,
          officer: officer,
          website: officersContext.place.website,
        },
        tx,
      )

      // // Run Phone Waterfall (Priority 3)
      // // Note: Phone waterfall doesn't have WithData variant yet (can be added if needed)
      await runPhoneWaterfall(
        {
          officerId: officer.id,
        },
        tx,
      )

      logger.debug({
        msg: '[enrich_company_officers] Finished processing officer enrichment',
        event: 'officer_enrichment_completed',
        metadata: {
          officerId: officer.id,
        },
      })
    } catch (officerError) {
      // Log officer enrichment failures but continue with other officers
      logger.error({
        msg: '[enrich_company_officers] Failed to enrich officer',
        event: 'officer_enrichment_failed',
        metadata: {
          companyId,
          officerId: officer.id,
          error:
            officerError instanceof Error
              ? officerError.message
              : String(officerError),
        },
      })
    }
  }

  logger.info({
    msg: '[enrich_company_officers] Completed officer enrichment',
    event: 'officer_enrichment_complete',
    metadata: {
      companyId,
      officersProcessed: officersContext.officers.length,
    },
  })
}
