/**
 * Shared Provider Helpers
 *
 * Common utilities for enrichment providers to ensure consistent
 * error handling and validation across all waterfalls.
 */

import {
  type ProviderError,
  type Result,
  createAuthenticationError,
  createRateLimitError,
  createTimeoutError,
} from './error_handling'

/**
 * Classify and create appropriate error from caught exception
 *
 * Automatically detects error type from error message and returns
 * the appropriate ProviderError with correct retryable flag.
 *
 * @example
 * try {
 *   const result = await apiCall()
 * } catch (error) {
 *   return { success: false, error: classifyError('my_provider', error) }
 * }
 */
export const classifyError = (
  provider: string,
  error: unknown,
  context?: Record<string, unknown>,
): ProviderError => {
  if (!(error instanceof Error)) {
    return {
      type: 'unknown',
      provider,
      message: String(error),
      isRetryable: true,
      context,
    }
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    const timeoutMs = extractTimeout(error.message) || 30000
    return createTimeoutError(provider, timeoutMs, error)
  }

  // Authentication errors
  if (
    error.message.includes('authentication') ||
    error.message.includes('unauthorized') ||
    error.message.includes('401') ||
    error.message.includes('403')
  ) {
    return createAuthenticationError(provider, error)
  }

  // Rate limit errors
  if (
    error.message.includes('rate limit') ||
    error.message.includes('429') ||
    error.message.includes('too many requests')
  ) {
    const retryAfter = extractRetryAfter(error.message)
    return createRateLimitError(provider, retryAfter, error)
  }

  // Network errors (retryable)
  if (
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('ENOTFOUND') ||
    error.message.includes('ETIMEDOUT') ||
    error.message.includes('network')
  ) {
    return {
      type: 'network',
      provider,
      message: error.message,
      isRetryable: true,
      context,
      cause: error,
    }
  }

  // Unknown error (default to retryable)
  return {
    type: 'unknown',
    provider,
    message: error.message,
    isRetryable: true,
    context,
    cause: error,
  }
}

/**
 * Check if a value is a placeholder (common in LLM outputs)
 *
 * @example
 * if (isPlaceholder(extractedValue)) {
 *   // Skip this value
 * }
 */
export const isPlaceholder = (value: string | null | undefined): boolean => {
  if (!value) return true

  const placeholders = [
    '<UNKNOWN>',
    'UNKNOWN',
    'MISSING',
    'N/A',
    'NOT_FOUND',
    'NULL',
    'NONE',
  ]

  return placeholders.some((placeholder) =>
    value.toUpperCase().includes(placeholder),
  )
}

/**
 * Validate required fields and return typed error if missing
 *
 * @example
 * const missingFields = validateRequiredFields(input, ['firstName', 'lastName'])
 * if (missingFields.length > 0) {
 *   return {
 *     success: false,
 *     error: createNoResultsError('my_provider', {
 *       reason: 'missing_required_fields',
 *       missingFields,
 *     }),
 *   }
 * }
 */
export const validateRequiredFields = <T>(
  input: T,
  requiredFields: Array<keyof T>,
): string[] => {
  return requiredFields
    .filter((field) => {
      const value = input[field]
      return (
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === '')
      )
    })
    .map(String)
}

/**
 * Extract timeout value from error message (in milliseconds)
 */
const extractTimeout = (message: string): number | undefined => {
  const match = message.match(/timeout.*?(\d+)/)
  return match ? Number.parseInt(match[1], 10) : undefined
}

/**
 * Extract retry-after value from error message (in seconds)
 */
const extractRetryAfter = (message: string): number | undefined => {
  const match = message.match(/retry.*?(\d+)/)
  return match ? Number.parseInt(match[1], 10) : undefined
}

/**
 * Type guard: check if Result is success
 *
 * @example
 * const result = await provider.execute()
 * if (isSuccess(result)) {
 *   // result.data is typed correctly
 * }
 */
export const isSuccess = <T, E>(
  result: Result<T, E>,
): result is Extract<Result<T, E>, { success: true }> => {
  return result.success === true
}

/**
 * Type guard: check if Result is failure
 */
export const isFailure = <T, E>(
  result: Result<T, E>,
): result is Extract<Result<T, E>, { success: false }> => {
  return result.success === false
}
