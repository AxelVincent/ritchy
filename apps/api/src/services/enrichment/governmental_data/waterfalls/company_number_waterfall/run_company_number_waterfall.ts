import { logger } from '@ritchy/logger'
import type { InterantionalSearchV1 } from '../../../../../external/pappers/international_search_v1'
import {
  type ProviderError,
  type Result,
  type WaterfallResult,
  isSuccess,
} from '../../../types/error_handling'
import {
  type ProviderConfig,
  getEnabledProviders,
} from '../../../waterfall_config'
import type {
  CompanyNumberResult,
  CompanyNumberWaterfallContext,
} from './index'
import { enrichWithPappers } from './providers/enrich_with_pappers'
import { enrichWithQdrant } from './providers/enrich_with_qdrant'

/**
 * Company number waterfall providers configuration
 * Order: Perplexity (fastest) → Qdrant (website-based) → Pappers (fallback)
 */
const COMPANY_NUMBER_PROVIDERS: readonly ProviderConfig[] = [
  {
    name: 'qdrant',
    enabled: true,
    priority: 1,
    description: 'Qdrant Vector Search - Website-based company lookup',
  },
  {
    name: 'pappers',
    enabled: true,
    priority: 2,
    description: 'Pappers API - European company registry fallback',
  },
] as const

/**
 * Core company number waterfall logic
 * Tries providers in order based on configuration priority
 * Returns as soon as a provider returns confidence >= threshold
 */
export const runCompanyNumberWaterfall = async (
  context: CompanyNumberWaterfallContext,
  searchParams: InterantionalSearchV1,
  confidenceThreshold = 70,
): Promise<WaterfallResult<CompanyNumberResult>> => {
  const { place, countryCode } = context
  const providerErrors: Array<{ provider: string; error: ProviderError }> = []
  const providersAttempted: string[] = []
  const enabledProviders = getEnabledProviders(COMPANY_NUMBER_PROVIDERS)

  logger.info({
    msg: '[company_number_waterfall] Starting company number waterfall',
    event: 'company_number_waterfall_start',
    metadata: {
      placeName: place.name,
      website: place.website,
      countryCode,
      providersCount: enabledProviders.length,
      providers: enabledProviders.map((p) => p.name),
      confidenceThreshold,
    },
  })

  for (const providerConfig of enabledProviders) {
    providersAttempted.push(providerConfig.name)

    logger.info({
      msg: `[company_number_waterfall] Trying provider: ${providerConfig.name}`,
      event: 'company_number_provider_attempt',
      metadata: {
        placeName: place.name,
        provider: providerConfig.name,
        priority: providerConfig.priority,
      },
    })

    let result: Result<CompanyNumberResult, ProviderError> | null = null

    // Call provider based on name
    switch (providerConfig.name) {
      case 'qdrant':
        result = await enrichWithQdrant(place, searchParams)
        break

      case 'pappers':
        result = await enrichWithPappers(place, searchParams)
        break
    }

    // Skip if result is null (shouldn't happen with type safety)
    if (!result) {
      logger.warn({
        msg: '[company_number_waterfall] Provider returned null result',
        event: 'company_number_provider_null',
        metadata: { provider: providerConfig.name },
      })
      continue
    }

    // Handle provider result
    if (isSuccess(result)) {
      // Check confidence threshold
      if (result.data.confidence >= confidenceThreshold) {
        logger.info({
          msg: '[company_number_waterfall] Successfully found company number',
          event: 'company_number_waterfall_success',
          metadata: {
            placeName: place.name,
            provider: providerConfig.name,
            companyNumber: result.data.companyNumber,
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
        msg: '[company_number_waterfall] Found result but confidence below threshold',
        event: 'company_number_low_confidence',
        metadata: {
          placeName: place.name,
          provider: providerConfig.name,
          companyNumber: result.data.companyNumber,
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
      msg: `[company_number_waterfall] Provider ${providerConfig.name} failed`,
      event: 'company_number_provider_failed',
      metadata: {
        placeName: place.name,
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
    msg: '[company_number_waterfall] All providers failed',
    event: 'company_number_waterfall_all_failed',
    metadata: {
      placeName: place.name,
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
    details: `All ${providersAttempted.length} providers failed to find company number with sufficient confidence`,
  }
}
