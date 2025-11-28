import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../../../db/schema'
import { insertEnrichmentCompanyOfficerLinkedIn } from '../../../queries/insert_enrichment_company_officer_linkedin'
import {
  type ProviderError,
  type Result,
  type WaterfallResult,
  isSuccess,
} from '../../../types/error_handling'
import { validateOfficerForEnrichment } from '../../../utils/validate_officer'
import {
  type ProviderConfig,
  getEnabledProviders,
} from '../../../waterfall_config'
import type { LinkedInResult, LinkedInWaterfallContext } from './index'
import { enrichWithClaudeWebSearch } from './providers/enrich_with_claude_web_search'
import { enrichWithContactOut } from './providers/enrich_with_contactout'
import { enrichWithIcypeasFindPeople } from './providers/enrich_with_icypeas_find_people'

/**
 * LinkedIn waterfall providers configuration
 * Order: Icypeas (fast + LLM matching) → ContactOut (fallback)
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
): Promise<WaterfallResult<LinkedInResult>> => {
  const providerErrors: Array<{ provider: string; error: ProviderError }> = []
  const providersAttempted: string[] = []
  const enabledProviders = getEnabledProviders(LINKEDIN_PROVIDERS)

  // Validate officer (data already pre-fetched)
  const validation = validateOfficerForEnrichment(context.officer, 'linkedin')
  if (!validation.valid) {
    return {
      status: 'empty',
      reason: 'validation_failed',
      providersAttempted: [],
      details: 'Officer validation failed',
    }
  }

  const validated = validation.data

  logger.info({
    msg: '[linkedin_waterfall] Starting LinkedIn waterfall',
    event: 'linkedin_waterfall_start',
    metadata: {
      officerId: validated.id,
      officerName: validated.fullName,
      providersCount: enabledProviders.length,
      providers: enabledProviders.map((p) => p.name),
      confidenceThreshold,
    },
  })

  for (const providerConfig of enabledProviders) {
    providersAttempted.push(providerConfig.name)

    logger.info({
      msg: `[linkedin_waterfall] Trying provider: ${providerConfig.name}`,
      event: 'linkedin_provider_attempt',
      metadata: {
        officerId: validated.id,
        provider: providerConfig.name,
        priority: providerConfig.priority,
      },
    })

    let result: Result<LinkedInResult, ProviderError> | null = null

    // Call provider based on name
    switch (providerConfig.name) {
      case 'claude_web_search':
        result = await enrichWithClaudeWebSearch(
          validated,
          context.company,
          context.place,
        )
        break

      case 'icypeas_find_people':
        result = await enrichWithIcypeasFindPeople(
          validated,
          context.company,
          context.place,
        )
        break

      case 'contactout_people_search':
        result = await enrichWithContactOut(validated)
        break

      default:
        logger.warn({
          msg: `[linkedin_waterfall] Unknown provider: ${providerConfig.name}`,
          event: 'linkedin_unknown_provider',
          metadata: {
            officerId: validated.id,
            provider: providerConfig.name,
          },
        })
        continue
    }

    // Skip if result is null (shouldn't happen with type safety)
    if (!result) {
      logger.warn({
        msg: '[linkedin_waterfall] Provider returned null result',
        event: 'linkedin_provider_null',
        metadata: { provider: providerConfig.name },
      })
      continue
    }

    // Handle provider result
    if (isSuccess(result)) {
      // Check confidence threshold
      if (result.data.confidence >= confidenceThreshold) {
        // Persist to database
        await insertEnrichmentCompanyOfficerLinkedIn(
          {
            officer_id: validated.id,
            profile_url: result.data.profileUrl,
            confidence: result.data.confidence,
            reasoning: result.data.reasoning,
            source: result.data.source || providerConfig.name,
          },
          context.tx,
        )

        logger.info({
          msg: '[linkedin_waterfall] Successfully found LinkedIn profile',
          event: 'linkedin_waterfall_success',
          metadata: {
            officerId: validated.id,
            provider: providerConfig.name,
            profileUrl: result.data.profileUrl,
            confidence: result.data.confidence,
            providersAttempted: providersAttempted.length,
          },
        })

        return {
          status: 'success',
          data: result.data,
          provider: providerConfig.name,
          confidence: result.data.confidence,
          metadata: result.metadata,
        }
      }

      // Found result but confidence too low
      logger.info({
        msg: '[linkedin_waterfall] Found result but confidence below threshold',
        event: 'linkedin_low_confidence',
        metadata: {
          officerId: validated.id,
          provider: providerConfig.name,
          profileUrl: result.data.profileUrl,
          confidence: result.data.confidence,
          threshold: confidenceThreshold,
        },
      })

      // Store as error (low confidence = not usable)
      providerErrors.push({
        provider: providerConfig.name,
        error: {
          type: 'no_results',
          provider: providerConfig.name,
          message: `Confidence ${result.data.confidence} below threshold ${confidenceThreshold}`,
          isRetryable: false,
          context: {
            confidence: result.data.confidence,
            threshold: confidenceThreshold,
          },
        },
      })

      // Continue to next provider
      continue
    }

    // Provider failed - collect error and try next
    providerErrors.push({
      provider: providerConfig.name,
      error: result.error,
    })

    logger.warn({
      msg: `[linkedin_waterfall] Provider ${providerConfig.name} failed`,
      event: 'linkedin_provider_failed',
      metadata: {
        officerId: validated.id,
        provider: providerConfig.name,
        errorType: result.error.type,
        errorMessage: result.error.message,
        isRetryable: result.error.isRetryable,
      },
    })

    // Continue to next provider
  }

  // All providers failed
  logger.error({
    msg: '[linkedin_waterfall] All providers failed',
    event: 'linkedin_waterfall_all_failed',
    metadata: {
      officerId: validated.id,
      providersAttempted,
      errorCount: providerErrors.length,
      errors: providerErrors.map((pe) => ({
        provider: pe.provider,
        type: pe.error.type,
        isRetryable: pe.error.isRetryable,
      })),
    },
  })

  return {
    status: 'empty',
    reason: 'no_results',
    providersAttempted,
    details: `All ${providersAttempted.length} providers failed to find LinkedIn profile with sufficient confidence`,
  }
}
