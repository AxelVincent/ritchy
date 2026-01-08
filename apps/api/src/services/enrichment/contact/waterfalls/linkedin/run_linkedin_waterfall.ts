import type { ProviderConfig } from '../../../shared/config/waterfall_config'
import type {
  ProviderError,
  Result,
} from '../../../shared/types/error_handling'
import { validateOfficerForEnrichment } from '../../../shared/utils/validate_officer'
import { executeWaterfall } from '../../../shared/waterfalls/waterfall_executor'
import { insertEnrichmentCompanyOfficerLinkedIn } from '../../queries/insert_enrichment_company_officer_linkedin'
import type { LinkedInResult, LinkedInWaterfallContext } from './index'
import { enrichWithClaudeWebSearch } from './providers/enrich_with_claude_web_search'
import { enrichWithContactOut } from './providers/enrich_with_contactout'
import { enrichWithIcypeasFindPeople } from './providers/enrich_with_icypeas_find_people'

/**
 * LinkedIn waterfall providers configuration
 * Order: Claude Web Search → Icypeas → ContactOut (fallback)
 */
const LINKEDIN_PROVIDERS: readonly ProviderConfig[] = [
  {
    name: 'claude_web_search',
    enabled: true,
    priority: 1,
    description: 'Claude Web Search - Google search with LLM matching',
  },
  {
    name: 'icypeas_find_people',
    enabled: true,
    priority: 2,
    description: 'Icypeas Find People - Fast search with LLM matching',
  },
  {
    name: 'contactout_people_search',
    enabled: true,
    priority: 3,
    description: 'ContactOut People Search - Comprehensive fallback',
  },
] as const

/**
 * Internal context with validated officer data for the executor
 */
interface LinkedInExecutorContext extends LinkedInWaterfallContext {
  readonly validated: {
    readonly id: string
    readonly firstName: string
    readonly lastName: string
    readonly fullName: string
    readonly role?: string | null
  }
}

/**
 * Execute a LinkedIn provider by name
 */
const executeLinkedInProvider = async (
  providerName: string,
  context: LinkedInExecutorContext,
): Promise<Result<LinkedInResult, ProviderError> | null> => {
  const { validated, company, place } = context

  switch (providerName) {
    case 'claude_web_search':
      return enrichWithClaudeWebSearch(validated, company, place)

    case 'icypeas_find_people':
      return enrichWithIcypeasFindPeople(validated, company, place)

    case 'contactout_people_search':
      return enrichWithContactOut(validated)

    default:
      return null
  }
}

/**
 * LinkedIn waterfall enrichment with pre-fetched data
 * Optimized for batch processing - eliminates N+1 queries
 *
 * Tries providers in order based on configuration priority
 * Returns as soon as a provider returns confidence >= threshold
 *
 * @param context - Context with pre-fetched officer, company, and place data
 * @param confidenceThreshold - Minimum confidence score to accept (default: 60)
 * @returns Enrichment result
 */
export const runLinkedInWaterfall = async (
  context: LinkedInWaterfallContext,
  confidenceThreshold = 60,
) => {
  // Validate officer first (before entering executor)
  const validation = validateOfficerForEnrichment(context.officer, 'linkedin')
  if (!validation.valid) {
    return {
      status: 'empty' as const,
      reason: 'validation_failed' as const,
      providersAttempted: [] as string[],
      details: `Officer validation failed: ${validation.reason}`,
    }
  }

  // Create executor context with validated data
  const executorContext: LinkedInExecutorContext = {
    ...context,
    validated: validation.data,
  }

  return executeWaterfall(
    {
      name: 'linkedin',
      providers: LINKEDIN_PROVIDERS,
      confidenceThreshold,

      executeProvider: executeLinkedInProvider,

      acceptResult: (result, threshold) => {
        return result.confidence >= (threshold ?? 60)
      },

      getConfidence: (result) => result.confidence,

      persistResult: async (result, providerName, ctx) => {
        await insertEnrichmentCompanyOfficerLinkedIn(
          {
            officer_id: ctx.validated.id,
            profile_url: result.profileUrl,
            confidence: result.confidence,
            reasoning: result.reasoning,
            source: result.source || providerName,
          },
          ctx.tx,
        )
      },
    },
    executorContext,
  )
}
