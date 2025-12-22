import { Router, type Router as RouterType } from 'express'
import { redisClient } from '../internal/redis/redis'

const router: RouterType = Router()

const STATUS_QUEUE_KEY = 'enrichment:status:queue'
const DEAD_LETTER_QUEUE_KEY = 'enrichment:status:dlq'
const CONSUMER_LOCK_KEY = 'enrichment:status:consumer:lock'

interface WebSocketHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  websocket: {
    queueDepth: number
    hasActiveConsumer: boolean
    consumerInstance: string | null
    dlqSize: number
  }
  checks: {
    queueBacklog: 'ok' | 'warning' | 'critical'
    consumerActive: 'ok' | 'critical'
    dlqSize: 'ok' | 'warning' | 'critical'
  }
}

router.get('/health/websocket', async (_req, res) => {
  try {
    const [queueDepth, consumerLock, dlqSize] = await Promise.all([
      redisClient.redis.llen(STATUS_QUEUE_KEY),
      redisClient.redis.get(CONSUMER_LOCK_KEY),
      redisClient.redis.llen(DEAD_LETTER_QUEUE_KEY),
    ])

    const checks = {
      queueBacklog:
        queueDepth < 100 ? 'ok' : queueDepth < 1000 ? 'warning' : 'critical',
      consumerActive: consumerLock ? 'ok' : 'critical',
      dlqSize: dlqSize < 10 ? 'ok' : dlqSize < 100 ? 'warning' : 'critical',
    } as const

    const hasCritical = Object.values(checks).includes('critical')
    const hasWarning = Object.values(checks).includes('warning')

    const health: WebSocketHealthResponse = {
      status: hasCritical ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy',
      websocket: {
        queueDepth,
        hasActiveConsumer: !!consumerLock,
        consumerInstance: consumerLock,
        dlqSize,
      },
      checks,
    }

    const statusCode = hasCritical ? 503 : 200
    res.status(statusCode).json(health)
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
