import type { NextFunction, Request, Response } from 'express'
import {
  type Semaphore,
  createSemaphore,
} from '../../../internal/redis/semaphore'
import type { ApiAuthRequest } from '../../../middleware/api_key_auth'
import { getUserPlan } from '../../../services/payment/queries/get_user_plan'
import type { Plan } from '../../../shared'

// Concurrency limits per plan (applied per account, not per API key)
const CONCURRENCY_LIMITS: Record<Plan, number> = {
  FREE: 1,
  ESSENTIALS: 10,
  PRO: 25,
  ENTERPRISE: 50,
}

// Cache semaphores per user account to avoid recreating
const semaphoreCache = new Map<string, Semaphore>()

const getOrCreateSemaphore = (
  userId: string,
  maxConcurrent: number,
): Semaphore => {
  const key = `api:user:${userId}`
  let semaphore = semaphoreCache.get(key)

  if (!semaphore || semaphore.maxConcurrent !== maxConcurrent) {
    semaphore = createSemaphore(key, maxConcurrent)
    semaphoreCache.set(key, semaphore)
  }

  return semaphore
}

/**
 * Concurrency limiting middleware for public API
 * Limits concurrent requests per user account
 */
export const apiConcurrencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { userId } = (req as ApiAuthRequest).apiAuth

  // Get user's plan to determine concurrency limit
  const plan = await getUserPlan(userId)
  const maxConcurrent = CONCURRENCY_LIMITS[plan] ?? CONCURRENCY_LIMITS.FREE

  // Semaphore is per user account (all API keys share the same limit)
  const semaphore = getOrCreateSemaphore(userId, maxConcurrent)
  const { acquired, current, max, release } = await semaphore.tryAcquire()

  if (!acquired) {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Concurrency limit reached. Maximum ${max} concurrent requests allowed for your account.`,
        details: { current, max },
      },
    })
    return
  }

  // Attach release function to response for cleanup
  res.on('finish', () => {
    release().catch(() => {})
  })

  res.on('close', () => {
    release().catch(() => {})
  })

  next()
}
