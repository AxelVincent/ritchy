import { logger } from '@ritchy/logger'
import { createRedisClient } from '../redis/redis'

/**
 * Configuration for the rate limiter
 */
type RateLimiterConfig = {
  readonly refillRate: number // Tokens added per second
  readonly capacity: number // Maximum tokens the bucket can hold
  readonly name: string // Required name for Redis keys
}

/**
 * Rate limiter metrics
 */
export type RateLimiterMetrics = {
  readonly totalRequests: number
  readonly queuedRequests: number
  readonly averageWaitTime: number
  readonly maxWaitTime: number
  readonly name: string
}

/**
 * Validates rate limiter configuration
 */
const validateConfig = (config: RateLimiterConfig): void => {
  if (!config.name) throw new Error('Name is required for rate limiter')
  if (config.refillRate <= 0) throw new Error('Refill rate must be positive')
  if (config.capacity <= 0) throw new Error('Capacity must be positive')
  if (config.refillRate > config.capacity) {
    throw new Error('Refill rate cannot exceed capacity')
  }
}

/**
 * Creates a distributed rate limiter using Redis
 *
 * @param config - Rate limiter configuration
 * @returns Rate limiter instance
 *
 * @example
 * ```ts
 * const googleMapsLimiter = createRateLimiter({
 *   refillRate: 50,    // 50 requests per second
 *   capacity: 100,     // Max burst of 100 requests
 *   name: 'google_maps'
 * })
 *
 * // Will wait if rate limited, then proceed
 * await googleMapsLimiter.getToken()
 * ```
 */
export const createRateLimiter = (config: RateLimiterConfig) => {
  validateConfig(config)
  const redis = createRedisClient({ isPublic: false })
  const prefix = `rate_limiter:${config.name}`

  const keys = {
    tokens: `${prefix}:tokens`,
    lastRefill: `${prefix}:last_refill`,
    metrics: `${prefix}:metrics`,
  }

  // Convert everything to work with milliseconds internally to avoid floating point
  const refreshTokens = async (): Promise<number> => {
    const multi = redis.redis.multi()

    // 1. Get current state
    const [tokensStr, lastRefillStr] = await Promise.all([
      redis.redis.get(keys.tokens),
      redis.redis.get(keys.lastRefill),
    ])

    const currentTokens = Math.floor(
      Number.parseFloat(tokensStr || String(config.capacity)),
    )
    const lastRefill = Number.parseInt(lastRefillStr || String(Date.now()))

    // 2. Calculate time passed in whole seconds
    const now = Date.now()
    const timePassedInSeconds = Math.floor((now - lastRefill) / 1000)

    // 3. Calculate tokens to add based on whole seconds
    const tokensToAdd = timePassedInSeconds * config.refillRate
    const newTokens = Math.floor(
      Math.min(config.capacity, currentTokens + tokensToAdd),
    )

    // 4. Only update lastRefill if we added tokens
    const newLastRefill = timePassedInSeconds > 0 ? now : lastRefill

    // 5. Update state atomically
    multi
      .set(keys.tokens, String(newTokens))
      .set(keys.lastRefill, String(newLastRefill))
    await multi.exec()

    return newTokens
  }

  const updateMetrics = async (waitTime: number) => {
    const metricsCache = await redis.get<RateLimiterMetrics>(keys.metrics)
    const metrics = metricsCache?.data

    const newMetrics: RateLimiterMetrics = {
      totalRequests: (metrics?.totalRequests || 0) + 1,
      queuedRequests: (metrics?.queuedRequests || 0) + (waitTime > 0 ? 1 : 0),
      averageWaitTime: metrics
        ? (metrics.averageWaitTime * metrics.totalRequests + waitTime) /
          (metrics.totalRequests + 1)
        : waitTime,
      maxWaitTime: Math.max(metrics?.maxWaitTime || 0, waitTime),
      name: config.name,
    }

    await redis.set(keys.metrics, newMetrics)
  }

  const getToken = async (): Promise<void> => {
    const startTime = Date.now()
    let waitTime = 0

    try {
      // Refresh and check tokens atomically
      let tokens = await refreshTokens()

      if (tokens < 1) {
        waitTime = Math.ceil(((1 - tokens) / config.refillRate) * 1000)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        tokens = await refreshTokens()
      }

      // Consume token atomically
      await redis.redis.decrby(keys.tokens, 1)
      await updateMetrics(waitTime)
    } catch (error) {
      logger.error({
        msg: 'Rate limiter error',
        event: 'rate_limiter_error',
        metadata: {
          error,
          limiter: config.name,
          waitTime,
          elapsedTime: Date.now() - startTime,
        },
      })
      throw error
    }
  }

  const getMetrics = async (): Promise<RateLimiterMetrics> => {
    const metricsCache = await redis.get<RateLimiterMetrics>(keys.metrics)
    if (!metricsCache?.data) {
      return {
        totalRequests: 0,
        queuedRequests: 0,
        averageWaitTime: 0,
        maxWaitTime: 0,
        name: config.name,
      }
    }
    return metricsCache.data
  }

  return { getToken, getMetrics }
}
