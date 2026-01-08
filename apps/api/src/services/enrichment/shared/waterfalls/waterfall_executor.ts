import { logger } from '@ritchy/logger'
import type { ProviderConfig } from '../config/waterfall_config'
import { getEnabledProviders } from '../config/waterfall_config'
import type {
  ProviderError,
  Result,
  WaterfallResult,
} from '../types/error_handling'
import { isSuccess } from '../types/error_handling'

/**
 * Generic Waterfall Executor
 *
 * Eliminates boilerplate across LinkedIn, Email, and Phone waterfalls by providing
 * a single, type-safe implementation of the provider iteration pattern.
 *
 * Each waterfall only needs to define:
 * 1. Provider configurations
 * 2. Provider execution functions
 * 3. Result persistence logic
 * 4. Optional validation logic
 */

/**
 * Configuration for a waterfall execution
 */
export interface WaterfallConfig<TContext, TResult> {
  /** Name of this waterfall for logging (e.g., 'linkedin', 'email', 'phone') */
  readonly name: string

  /** Provider configurations (will be filtered to enabled only) */
  readonly providers: readonly ProviderConfig[]

  /** Optional confidence threshold for accepting results */
  readonly confidenceThreshold?: number

  /** Validate context before running providers. Return error message if invalid. */
  readonly validateContext?: (
    context: TContext,
  ) => { valid: true } | { valid: false; reason: string }

  /** Execute a specific provider. Return Result with data or error. */
  readonly executeProvider: (
    providerName: string,
    context: TContext,
  ) => Promise<Result<TResult, ProviderError> | null>

  /** Check if result meets acceptance criteria (e.g., confidence threshold) */
  readonly acceptResult?: (result: TResult, threshold?: number) => boolean

  /** Persist successful result to database */
  readonly persistResult?: (
    result: TResult,
    providerName: string,
    context: TContext,
  ) => Promise<void>

  /** Extract confidence from result for logging (optional) */
  readonly getConfidence?: (result: TResult) => number | undefined
}

/**
 * Execute a waterfall with the given configuration
 *
 * This function handles:
 * - Context validation
 * - Provider iteration in priority order
 * - Error collection and logging
 * - Result persistence
 * - Confidence threshold checking
 *
 * @param config - Waterfall configuration
 * @param context - Context data for this execution
 * @returns WaterfallResult with success data or failure info
 */
export const executeWaterfall = async <TContext, TResult>(
  config: WaterfallConfig<TContext, TResult>,
  context: TContext,
): Promise<WaterfallResult<TResult>> => {
  const providerErrors: Array<{ provider: string; error: ProviderError }> = []
  const providersAttempted: string[] = []
  const enabledProviders = getEnabledProviders(config.providers)

  // Validate context if validator provided
  if (config.validateContext) {
    const validation = config.validateContext(context)
    if (!validation.valid) {
      logger.debug({
        msg: `[${config.name}_waterfall] Context validation failed`,
        event: `${config.name}_waterfall_validation_failed`,
        metadata: { reason: validation.reason },
      })

      return {
        status: 'empty',
        reason: 'validation_failed',
        providersAttempted: [],
        details: validation.reason,
      }
    }
  }

  // Check if any providers are enabled
  if (enabledProviders.length === 0) {
    logger.warn({
      msg: `[${config.name}_waterfall] No providers enabled`,
      event: `${config.name}_waterfall_no_providers`,
    })

    return {
      status: 'empty',
      reason: 'skipped',
      providersAttempted: [],
      details: 'No providers enabled for this waterfall',
    }
  }

  logger.info({
    msg: `[${config.name}_waterfall] Starting waterfall`,
    event: `${config.name}_waterfall_start`,
    metadata: {
      providersCount: enabledProviders.length,
      providers: enabledProviders.map((p) => p.name),
      confidenceThreshold: config.confidenceThreshold,
    },
  })

  // Iterate through providers in priority order
  for (const providerConfig of enabledProviders) {
    providersAttempted.push(providerConfig.name)

    logger.info({
      msg: `[${config.name}_waterfall] Trying provider: ${providerConfig.name}`,
      event: `${config.name}_provider_attempt`,
      metadata: {
        provider: providerConfig.name,
        priority: providerConfig.priority,
      },
    })

    try {
      const result = await config.executeProvider(providerConfig.name, context)

      // Skip if provider returned null (unknown provider)
      if (!result) {
        logger.warn({
          msg: `[${config.name}_waterfall] Provider returned null`,
          event: `${config.name}_provider_null`,
          metadata: { provider: providerConfig.name },
        })
        continue
      }

      // Handle successful result
      if (isSuccess(result)) {
        // Check acceptance criteria (e.g., confidence threshold)
        const shouldAccept = config.acceptResult
          ? config.acceptResult(result.data, config.confidenceThreshold)
          : true

        if (shouldAccept) {
          // Persist result if persistor provided
          if (config.persistResult) {
            await config.persistResult(
              result.data,
              providerConfig.name,
              context,
            )
          }

          const confidence = config.getConfidence?.(result.data)

          logger.info({
            msg: `[${config.name}_waterfall] Successfully found result`,
            event: `${config.name}_waterfall_success`,
            metadata: {
              provider: providerConfig.name,
              confidence,
              providersAttempted: providersAttempted.length,
            },
          })

          return {
            status: 'success',
            data: result.data,
            provider: providerConfig.name,
            confidence,
            metadata: result.metadata,
          }
        }

        // Result didn't meet acceptance criteria
        const confidence = config.getConfidence?.(result.data)
        logger.info({
          msg: `[${config.name}_waterfall] Result below threshold`,
          event: `${config.name}_low_confidence`,
          metadata: {
            provider: providerConfig.name,
            confidence,
            threshold: config.confidenceThreshold,
          },
        })

        providerErrors.push({
          provider: providerConfig.name,
          error: {
            type: 'no_results',
            provider: providerConfig.name,
            message: 'Result did not meet acceptance criteria',
            isRetryable: false,
            context: { confidence, threshold: config.confidenceThreshold },
          },
        })

        continue
      }

      // Provider failed - collect error
      providerErrors.push({
        provider: providerConfig.name,
        error: result.error,
      })

      logger.warn({
        msg: `[${config.name}_waterfall] Provider failed`,
        event: `${config.name}_provider_failed`,
        metadata: {
          provider: providerConfig.name,
          errorType: result.error.type,
          errorMessage: result.error.message,
          isRetryable: result.error.isRetryable,
        },
      })
    } catch (error) {
      // Unexpected error - wrap and continue
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      providerErrors.push({
        provider: providerConfig.name,
        error: {
          type: 'unknown',
          provider: providerConfig.name,
          message: errorMessage,
          isRetryable: true,
          cause: error instanceof Error ? error : undefined,
        },
      })

      logger.error({
        msg: `[${config.name}_waterfall] Provider threw unexpected error`,
        event: `${config.name}_provider_error`,
        metadata: {
          provider: providerConfig.name,
          error: errorMessage,
        },
      })
    }
  }

  // All providers exhausted
  logger.info({
    msg: `[${config.name}_waterfall] All providers exhausted`,
    event: `${config.name}_waterfall_exhausted`,
    metadata: {
      providersAttempted,
      errorCount: providerErrors.length,
    },
  })

  return {
    status: 'empty',
    reason: 'no_results',
    providersAttempted,
    details: `All ${providersAttempted.length} providers failed to find results`,
  }
}

/**
 * Helper to create a simple provider executor from a map of provider functions
 */
export const createProviderExecutor = <TContext, TResult>(
  providerMap: Record<
    string,
    (context: TContext) => Promise<Result<TResult, ProviderError>>
  >,
): WaterfallConfig<TContext, TResult>['executeProvider'] => {
  return async (providerName, context) => {
    const provider = providerMap[providerName]
    if (!provider) {
      return null
    }
    return provider(context)
  }
}
