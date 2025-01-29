/**
 * Represents the internal state of a token bucket rate limiter
 */
type TokenBucketState = {
  readonly tokens: number
  readonly lastRefill: number
  readonly refillRate: number
  readonly capacity: number
}

/**
 * Custom error thrown when rate limit is exceeded
 */
class RateLimitExceededError extends Error {
  constructor(waitTimeMs: number) {
    super('Rate limit exceeded')
    this.name = 'RateLimitExceededError'
    this.waitTimeMs = waitTimeMs
  }
  waitTimeMs: number
}

const validateConfig = (refillRate: number, capacity: number): void => {
  if (refillRate <= 0) throw new Error('Refill rate must be positive')
  if (capacity <= 0) throw new Error('Capacity must be positive')
  if (refillRate > capacity)
    throw new Error('Refill rate cannot exceed capacity')
}

const createRefill = (currentState: TokenBucketState): TokenBucketState => {
  const now = Date.now()
  const timePassed = (now - currentState.lastRefill) / 1000
  const newTokens = timePassed * currentState.refillRate

  return {
    ...currentState,
    tokens:
      Math.round(
        Math.min(currentState.capacity, currentState.tokens + newTokens) * 1000,
      ) / 1000,
    lastRefill: now,
  }
}

/**
 * Creates a token bucket rate limiter
 * @param refillRate - Number of tokens to add per second
 * @param capacity - Maximum number of tokens the bucket can hold
 * @returns An object containing methods to interact with the rate limiter
 *
 * @example
 * ```ts
 * const limiter = createTokenBucket(10, 100) // 10 tokens per second, max 100 tokens
 *
 * // Wait for token if none available
 * await limiter.getToken()
 *
 * // Throw error if rate limited
 * await limiter.getToken({ throwOnLimit: true })
 *
 * // Get usage metrics
 * const metrics = limiter.getMetrics()
 * ```
 */
const createTokenBucket = (refillRate: number, capacity: number) => {
  validateConfig(refillRate, capacity)

  let state: TokenBucketState = {
    tokens: capacity,
    lastRefill: Date.now(),
    refillRate,
    capacity,
  }

  const metrics = {
    totalRequests: 0,
    rateLimitedRequests: 0,
  }

  /**
   * Attempts to get a token from the bucket
   * @param options - Configuration options
   * @param options.throwOnLimit - If true, throws RateLimitExceededError instead of waiting
   * @throws {RateLimitExceededError} When throwOnLimit is true and no tokens are available
   */
  const getToken = async (options?: {
    throwOnLimit?: boolean
  }): Promise<void> => {
    metrics.totalRequests++

    state = createRefill(state)

    if (state.tokens < 1) {
      metrics.rateLimitedRequests++
      const waitTimeMs = Math.ceil(
        ((1 - state.tokens) / state.refillRate) * 1000,
      )

      if (options?.throwOnLimit) {
        throw new RateLimitExceededError(waitTimeMs)
      }

      await new Promise((resolve) => setTimeout(resolve, waitTimeMs))
      state = createRefill(state)
    }

    state = { ...state, tokens: state.tokens - 1 }
  }

  /**
   * Returns the current usage metrics
   * @returns Object containing total requests and rate limited requests counts
   */
  const getMetrics = () => ({ ...metrics })

  return {
    getToken,
    getMetrics,
  }
}

/**
 * Pre-configured rate limiter for Google Places API
 * Limits requests to 600 per minute as per Google Places API requirements
 * Both capacity and refill rate are set to 600/minute (10/second)
 * Note: Google's quota resets every minute, while this provides a rolling window
 */
export const googlePlacesRateLimiter = createTokenBucket(600 / 60, 600)
