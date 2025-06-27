import { logger } from '@ritchy/logger'
import { sendSlackNotification } from '../slack/slack'
import { redisClient } from './redis'

type HealthMetrics = {
  status: 'healthy' | 'unhealthy' | 'degraded'
  latency: number
  lastCheck: string
  error?: string
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
}

type HealthMonitor = {
  start: (intervalMs?: number) => void
  stop: () => void
  getMetrics: () => HealthMetrics
  isHealthy: () => boolean
  getHealthReport: () => {
    healthy: boolean
    metrics: HealthMetrics
    recommendations?: string[]
  }
}

// State management using closure
let metrics: HealthMetrics = {
  status: 'unhealthy',
  latency: 0,
  lastCheck: new Date().toISOString(),
  connectionStatus: 'disconnected',
}

let isRunning = false
let checkInterval: NodeJS.Timeout | null = null

/**
 * Get current Redis connection status
 */
const getConnectionStatus = ():
  | 'connected'
  | 'disconnected'
  | 'reconnecting' => {
  const redis = redisClient.redis
  if (redis.status === 'ready') return 'connected'
  if (redis.status === 'connecting' || redis.status === 'reconnecting')
    return 'reconnecting'
  return 'disconnected'
}

/**
 * Perform a single health check
 */
const performHealthCheck = async (): Promise<void> => {
  const start = Date.now()
  const checkTime = new Date().toISOString()

  try {
    const connectionStatus = getConnectionStatus()
    const result = await redisClient.redis.ping()
    const latency = Date.now() - start

    if (result === 'PONG') {
      metrics = {
        status: latency < 100 ? 'healthy' : 'degraded',
        latency,
        lastCheck: checkTime,
        connectionStatus,
      }

      logger.info({
        msg: 'Redis health check passed',
        event: 'redis_health_check_success',
        metadata: {
          latency,
          status: metrics.status,
          connectionStatus,
        },
      })
    } else {
      metrics = {
        status: 'unhealthy',
        latency,
        lastCheck: checkTime,
        error: `Unexpected PING response: ${result}`,
        connectionStatus,
      }

      sendSlackNotification({
        channel: 'tech_monitoring',
        text: `🚨 Redis health check failed - unexpected response: ${result}`,
      })

      logger.error({
        msg: 'Redis health check failed - unexpected response',
        event: 'redis_health_check_failed',
        metadata: {
          latency,
          result,
          connectionStatus,
        },
      })
    }
  } catch (error) {
    const latency = Date.now() - start
    const errorMessage = error instanceof Error ? error.message : String(error)

    metrics = {
      status: 'unhealthy',
      latency,
      lastCheck: checkTime,
      error: errorMessage,
      connectionStatus: 'disconnected',
    }

    sendSlackNotification({
      channel: 'tech_monitoring',
      text: `🚨 Redis health check failed - connection error: ${errorMessage}`,
    })

    logger.error({
      msg: 'Redis health check failed',
      event: 'redis_health_check_error',
      metadata: {
        error,
        latency,
      },
    })
  }
}

/**
 * Start the health monitoring background job
 */
const start = (intervalMs = 30000): void => {
  if (isRunning) {
    logger.warn({
      msg: 'Redis health monitor is already running',
      event: 'redis_health_monitor_already_running',
    })
    return
  }

  isRunning = true
  logger.info({
    msg: 'Starting Redis health monitor',
    event: 'redis_health_monitor_started',
    metadata: { intervalMs },
  })

  // Perform initial check
  performHealthCheck()

  // Set up periodic checks
  checkInterval = setInterval(() => {
    performHealthCheck()
  }, intervalMs)
}

/**
 * Stop the health monitoring background job
 */
const stop = (): void => {
  if (!isRunning) {
    return
  }

  isRunning = false
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }

  logger.info({
    msg: 'Stopped Redis health monitor',
    event: 'redis_health_monitor_stopped',
  })
}

/**
 * Get current health metrics
 */
const getMetrics = (): HealthMetrics => {
  return { ...metrics }
}

/**
 * Check if Redis is healthy
 */
const isHealthy = (): boolean => {
  return metrics.status === 'healthy' || metrics.status === 'degraded'
}

/**
 * Get detailed health report
 */
const getHealthReport = (): {
  healthy: boolean
  metrics: HealthMetrics
  recommendations?: string[]
} => {
  const recommendations: string[] = []

  if (metrics.latency > 100) {
    recommendations.push(
      'Redis latency is high - consider optimizing queries or scaling',
    )
  }

  if (metrics.connectionStatus !== 'connected') {
    recommendations.push(
      'Redis connection is not stable - check network and configuration',
    )
  }

  return {
    healthy: isHealthy(),
    metrics,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
  }
}

/**
 * Create and export the health monitor
 */
const createRedisHealthMonitor = (): HealthMonitor => ({
  start,
  stop,
  getMetrics,
  isHealthy,
  getHealthReport,
})

// Export singleton instance
export const redisHealthMonitor = createRedisHealthMonitor()
