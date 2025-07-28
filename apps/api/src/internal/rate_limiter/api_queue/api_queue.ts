import { logger } from '@ritchy/logger'
import { createRedisClient } from '../../redis/redis'
import type { RateLimiterMetrics } from '../index'
import { createQueueMonitor } from './monitoring'

type QueueConfig = {
  name: string
  rateLimiter: {
    getToken: () => Promise<void>
    getMetrics: () => Promise<RateLimiterMetrics>
  }
  concurrency?: number
}

export const createApiQueue = (config: QueueConfig) => {
  const redis = createRedisClient({ isPublic: false })
  const maxConcurrent = config.concurrency || 5
  const processingKey = `processing:${config.name}`

  const acquireProcessingSlot = async (): Promise<boolean> => {
    const processing = await redis.redis.incr(processingKey)
    if (processing <= maxConcurrent) {
      return true
    }
    await redis.redis.decr(processingKey)
    return false
  }

  const releaseProcessingSlot = async (): Promise<void> => {
    await redis.redis.decr(processingKey)
  }

  const monitor = createQueueMonitor({
    name: config.name,
    rateLimiter: config.rateLimiter,
    concurrency: config.concurrency || 5,
  })

  // Start monitoring
  monitor.startMonitoring()

  const addToQueue = async <T>(fn: () => Promise<T>): Promise<T> => {
    const startTime = Date.now()

    while (!(await acquireProcessingSlot())) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    monitor.incrementActive()

    try {
      await config.rateLimiter.getToken()
      const result = await fn()
      monitor.recordRequest(startTime)
      return result
    } catch (error) {
      monitor.recordRequest(startTime, error as Error)
      throw error
    } finally {
      monitor.decrementActive()
      await releaseProcessingSlot()
    }
  }

  return { addToQueue }
}
