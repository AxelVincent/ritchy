import { logger } from '@ritchy/logger'
import type { NextFunction, Request, Response } from 'express'
import { createRedisClient } from '../../../internal/redis/redis'
import type { ApiAuthRequest } from '../../../middleware/api_key_auth'
import { getUserPlan } from '../../../services/payment/queries/get_user_plan'
import type { Plan } from '../../../shared'

// Rate limits per plan (applied per account)
const RATE_LIMITS: Record<Plan, { perMinute: number; perDay: number }> = {
  FREE: { perMinute: 10, perDay: 100 },
  ESSENTIALS: { perMinute: 30, perDay: 1000 },
  PRO: { perMinute: 60, perDay: 5000 },
  ENTERPRISE: { perMinute: 120, perDay: -1 }, // -1 = unlimited
}

const redis = createRedisClient({ isPublic: false })

/**
 * Simple sliding window rate limiter using Redis
 */
const checkRateLimit = async (
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; current: number; retryAfter?: number }> => {
  if (limit < 0) {
    // Unlimited
    return { allowed: true, current: 0 }
  }

  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - windowSeconds

  // Use Redis sorted set for sliding window
  const multi = redis.redis.multi()

  // Remove old entries
  multi.zremrangebyscore(key, 0, windowStart)

  // Add current request
  multi.zadd(key, now, `${now}-${Math.random()}`)

  // Count requests in window
  multi.zcard(key)

  // Set expiry
  multi.expire(key, windowSeconds)

  const results = await multi.exec()

  const count = (results?.[2]?.[1] as number) ?? 0

  if (count > limit) {
    // Get oldest entry to calculate retry after
    const oldest = await redis.redis.zrange(key, 0, 0, 'WITHSCORES')
    const oldestTime = oldest?.[1] ? Number.parseInt(oldest[1], 10) : now
    const retryAfter = Math.max(1, oldestTime + windowSeconds - now)

    return { allowed: false, current: count, retryAfter }
  }

  return { allowed: true, current: count }
}

/**
 * Rate limiting middleware for public API
 * Applied per user account (not per API key)
 */
export const apiRateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = (req as ApiAuthRequest).apiAuth

    const plan = await getUserPlan(userId)
    const limits = RATE_LIMITS[plan] ?? RATE_LIMITS.FREE

    // Check per-minute limit
    const minuteKey = `api:rate:minute:${userId}`
    const minuteResult = await checkRateLimit(minuteKey, limits.perMinute, 60)

    if (!minuteResult.allowed) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `Rate limit exceeded. Maximum ${limits.perMinute} requests per minute.`,
          details: {
            retryAfter: minuteResult.retryAfter,
            limit: limits.perMinute,
            window: '1 minute',
          },
        },
      })
      return
    }

    // Check per-day limit (skip if unlimited)
    if (limits.perDay > 0) {
      const dayKey = `api:rate:day:${userId}`
      const dayResult = await checkRateLimit(dayKey, limits.perDay, 86400)

      if (!dayResult.allowed) {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Daily limit exceeded. Maximum ${limits.perDay} requests per day.`,
            details: {
              retryAfter: dayResult.retryAfter,
              limit: limits.perDay,
              window: '24 hours',
            },
          },
        })
        return
      }
    }

    next()
  } catch (error) {
    logger.error({
      msg: 'Rate limiting error',
      event: 'api_rate_limit_error',
      metadata: { error },
    })

    // On error, allow the request through (fail open)
    next()
  }
}
