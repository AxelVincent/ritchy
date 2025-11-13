import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../../../db/schema'
import { validateOfficerForEnrichment } from '../../../utils/validate_officer'
import { enrichLinkedInCore } from './enrich_linkedin_core'
import type {
  LinkedInWaterfallResult,
  LinkedInWaterfallWithDataContext,
} from './index'

/**
 * Optimized LinkedIn waterfall enrichment with pre-fetched data
 * Best for batch processing multiple officers - eliminates N+1 queries
 *
 * @param context - Context with pre-fetched officer, company, and place data
 * @param tx - Optional database transaction
 * @returns Enrichment result
 */
export const runLinkedInWaterfallWithData = async (
  context: LinkedInWaterfallWithDataContext,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<LinkedInWaterfallResult> => {
  // Validate officer (data already fetched)
  const validation = validateOfficerForEnrichment(context.officer, 'linkedin')
  if (!validation.valid) {
    return { success: false }
  }

  // Run core enrichment logic with pre-fetched data
  return enrichLinkedInCore(validation.data, context.company, context.place, tx)
}
