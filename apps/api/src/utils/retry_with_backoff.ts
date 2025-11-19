import { logger } from '@ritchy/logger'

export type RetryOptions = {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxAttempts?: number
  /**
   * Initial backoff delay in milliseconds
   * @default 1000
   */
  initialBackoffMs?: number
  /**
   * Backoff multiplier for exponential backoff
   * @default 2
   */
  backoffMultiplier?: number
  /**
   * Optional callback invoked before each retry
   */
  onRetry?: (error: Error, attempt: number, nextBackoffMs: number) => void
  /**
   * Optional context for logging (e.g., 'LLM Detection', 'Database Query')
   */
  context?: string
}

/**
 * Executes an async function with exponential backoff retry logic
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await fetchData(),
 *   { maxAttempts: 3, initialBackoffMs: 1000, context: 'API Fetch' }
 * )
 * ```
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const {
    maxAttempts = 3,
    initialBackoffMs = 1000,
    backoffMultiplier = 2,
    onRetry,
    context = 'Operation',
  } = options

  let lastError: Error | unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // If this was the last attempt, throw the error
      if (attempt >= maxAttempts) {
        break
      }

      const backoffMs = initialBackoffMs * backoffMultiplier ** (attempt - 1)

      // Call custom retry callback if provided
      if (onRetry && error instanceof Error) {
        onRetry(error, attempt, backoffMs)
      }

      // Log retry attempt
      logger.warn({
        msg: `[Retry] ${context} failed, retrying (${attempt}/${maxAttempts})`,
        event: 'retry_with_backoff',
        metadata: {
          context,
          attempt,
          maxAttempts,
          nextBackoffMs: backoffMs,
          error: error instanceof Error ? error.message : String(error),
        },
      })

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }
  }

  // All retries failed, throw the last error
  throw lastError
}
