/**
 * Comprehensive Error Handling Strategy for Enrichment System
 *
 * This module defines a consistent error handling approach across all enrichment operations.
 * It provides type-safe error handling with discriminated unions and functional Result types.
 *
 * Key principles:
 * 1. Use Result<T, E> types instead of throwing errors for expected failures
 * 2. Only throw errors for truly exceptional/unexpected situations
 * 3. Provide detailed error context for debugging
 * 4. Distinguish between retryable and non-retryable errors
 * 5. Track error metadata for observability
 */

/**
 * Result type for operations that can fail
 * Inspired by Rust's Result<T, E> and functional programming patterns
 */
export type Result<T, E = EnrichmentError> =
  | { success: true; data: T; metadata?: Record<string, unknown> }
  | { success: false; error: E }

/**
 * Base error interface for all enrichment errors
 */
export interface EnrichmentError {
  readonly type: string
  readonly message: string
  readonly isRetryable: boolean
  readonly context?: Record<string, unknown>
  readonly cause?: Error
}

/**
 * Provider-specific error types
 */
export type ProviderError =
  | RateLimitError
  | AuthenticationError
  | TimeoutError
  | InvalidResponseError
  | NoResultsError
  | QuotaExceededError
  | NetworkError
  | UnknownProviderError

export interface RateLimitError extends EnrichmentError {
  type: 'rate_limit'
  provider: string
  retryAfter?: number // seconds
  isRetryable: true
}

export interface AuthenticationError extends EnrichmentError {
  type: 'authentication'
  provider: string
  isRetryable: false
}

export interface TimeoutError extends EnrichmentError {
  type: 'timeout'
  provider: string
  timeoutMs: number
  isRetryable: true
}

export interface InvalidResponseError extends EnrichmentError {
  type: 'invalid_response'
  provider: string
  validationErrors?: string[]
  isRetryable: false
}

export interface NoResultsError extends EnrichmentError {
  type: 'no_results'
  provider: string
  isRetryable: false // No point retrying if provider has no results
}

export interface QuotaExceededError extends EnrichmentError {
  type: 'quota_exceeded'
  provider: string
  quotaType: 'daily' | 'monthly' | 'total'
  limit: number
  current: number
  isRetryable: false
}

export interface NetworkError extends EnrichmentError {
  type: 'network'
  provider: string
  statusCode?: number
  isRetryable: boolean // Can be true or false depending on status code
}

export interface UnknownProviderError extends EnrichmentError {
  type: 'unknown'
  provider: string
  isRetryable: true
}

/**
 * Validation error types
 */
export type ValidationError =
  | OfficerValidationError
  | CompanyValidationError
  | ConfigurationError

export interface OfficerValidationError extends EnrichmentError {
  type: 'officer_validation'
  reason:
    | 'legal_entity'
    | 'no_name'
    | 'incomplete_name'
    | 'invalid_type'
    | 'missing_required_field'
  officerId: string
  isRetryable: false
}

export interface CompanyValidationError extends EnrichmentError {
  type: 'company_validation'
  reason: 'invalid_company_number' | 'missing_domain' | 'invalid_country_code'
  companyId?: string
  isRetryable: false
}

export interface ConfigurationError extends EnrichmentError {
  type: 'configuration'
  reason: 'no_providers_enabled' | 'invalid_provider_config' | 'missing_api_key'
  isRetryable: false
}

/**
 * Waterfall-specific error types
 */
export interface WaterfallError extends EnrichmentError {
  type: 'waterfall'
  waterfallType: 'linkedin' | 'email' | 'phone'
  providersAttempted: string[]
  providerErrors: Array<{
    provider: string
    error: ProviderError
  }>
  isRetryable: boolean // True if any provider error was retryable
}

/**
 * Waterfall result type with detailed status
 */
export type WaterfallResult<T> =
  | {
      status: 'success'
      data: T
      provider: string
      confidence?: number
      metadata?: Record<string, unknown>
    }
  | {
      status: 'empty'
      reason: 'no_results' | 'skipped' | 'validation_failed'
      providersAttempted: string[]
      details?: string
    }
  | {
      status: 'failed'
      error: WaterfallError
      providersAttempted: string[]
    }

/**
 * Helper functions for creating errors
 */
export const createRateLimitError = (
  provider: string,
  retryAfter?: number,
  cause?: Error,
): RateLimitError => ({
  type: 'rate_limit',
  provider,
  message: `Rate limit exceeded for ${provider}${retryAfter ? `. Retry after ${retryAfter}s` : ''}`,
  isRetryable: true,
  retryAfter,
  cause,
})

export const createAuthenticationError = (
  provider: string,
  cause?: Error,
): AuthenticationError => ({
  type: 'authentication',
  provider,
  message: `Authentication failed for ${provider}. Check API credentials.`,
  isRetryable: false,
  cause,
})

export const createTimeoutError = (
  provider: string,
  timeoutMs: number,
  cause?: Error,
): TimeoutError => ({
  type: 'timeout',
  provider,
  message: `Request to ${provider} timed out after ${timeoutMs}ms`,
  isRetryable: true,
  timeoutMs,
  cause,
})

export const createNoResultsError = (
  provider: string,
  context?: Record<string, unknown>,
): NoResultsError => ({
  type: 'no_results',
  provider,
  message: `No results found from ${provider}`,
  isRetryable: false,
  context,
})

export const createQuotaExceededError = (
  provider: string,
  quotaType: 'daily' | 'monthly' | 'total',
  limit: number,
  current: number,
): QuotaExceededError => ({
  type: 'quota_exceeded',
  provider,
  message: `${quotaType} quota exceeded for ${provider}: ${current}/${limit}`,
  isRetryable: false,
  quotaType,
  limit,
  current,
})

export const createOfficerValidationError = (
  reason: OfficerValidationError['reason'],
  officerId: string,
  details?: string,
): OfficerValidationError => ({
  type: 'officer_validation',
  reason,
  officerId,
  message: `Officer validation failed: ${reason}${details ? ` - ${details}` : ''}`,
  isRetryable: false,
  context: { officerId, reason, details },
})

export const createWaterfallError = (
  waterfallType: 'linkedin' | 'email' | 'phone',
  providersAttempted: string[],
  providerErrors: Array<{ provider: string; error: ProviderError }>,
): WaterfallError => {
  const hasRetryableError = providerErrors.some((pe) => pe.error.isRetryable)

  return {
    type: 'waterfall',
    waterfallType,
    providersAttempted,
    providerErrors,
    message: `All ${waterfallType} providers failed (${providersAttempted.length} attempted)`,
    isRetryable: hasRetryableError,
    context: {
      providersAttempted,
      errorCount: providerErrors.length,
    },
  }
}

/**
 * Type guards
 */
export const isSuccess = <T, E>(
  result: Result<T, E>,
): result is Extract<Result<T, E>, { success: true }> => {
  return result.success === true
}

export const isFailure = <T, E>(
  result: Result<T, E>,
): result is Extract<Result<T, E>, { success: false }> => {
  return result.success === false
}

export const isRetryableError = (error: EnrichmentError): boolean => {
  return error.isRetryable
}

/**
 * Result combinators for functional composition
 */
export const mapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U,
): Result<U, E> => {
  if (result.success) {
    return { success: true, data: fn(result.data), metadata: result.metadata }
  }
  return result
}

export const flatMapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>,
): Result<U, E> => {
  if (result.success) {
    return fn(result.data)
  }
  return result
}

export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  return result.success ? result.data : defaultValue
}

export const unwrapOrElse = <T, E>(
  result: Result<T, E>,
  fn: (error: E) => T,
): T => {
  return result.success ? result.data : fn(result.error)
}

/**
 * Collect multiple results and return first success or all errors
 */
export const firstSuccess = <T, E>(results: Result<T, E>[]): Result<T, E[]> => {
  for (const result of results) {
    if (result.success) {
      return { success: true, data: result.data, metadata: result.metadata }
    }
  }

  const errors = results
    .filter((r): r is Extract<Result<T, E>, { success: false }> => !r.success)
    .map((r) => r.error)

  return {
    success: false,
    error: errors,
  }
}

/**
 * Convert a throwing function to a Result-returning function
 */
export const tryCatch = <T, E = EnrichmentError>(
  fn: () => T,
  onError: (error: unknown) => E,
): Result<T, E> => {
  try {
    const data = fn()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: onError(error) }
  }
}

/**
 * Convert an async throwing function to a Result-returning function
 */
export const tryCatchAsync = async <T, E = EnrichmentError>(
  fn: () => Promise<T>,
  onError: (error: unknown) => E,
): Promise<Result<T, E>> => {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: onError(error) }
  }
}
