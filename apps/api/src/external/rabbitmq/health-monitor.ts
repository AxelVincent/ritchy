import { logger } from '@ritchy/logger'
import { QUEUE_CONFIG } from '../../config/rabbitmq'
import { sendSlackNotification } from '../slack/slack'
import { rabbitMQClient } from './rabbitmq'

type HealthMetrics = {
  status: 'healthy' | 'unhealthy' | 'degraded'
  latency: number
  lastCheck: string
  error?: string
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  queueMetrics: {
    mainQueue: {
      messageCount: number
      consumerCount: number
      status: 'healthy' | 'warning' | 'critical'
    }
    deadLetterQueue: {
      messageCount: number
      consumerCount: number
      status: 'healthy' | 'warning' | 'critical'
    }
  }
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
  queueMetrics: {
    mainQueue: {
      messageCount: 0,
      consumerCount: 0,
      status: 'critical',
    },
    deadLetterQueue: {
      messageCount: 0,
      consumerCount: 0,
      status: 'healthy',
    },
  },
}

let isRunning = false
let checkInterval: NodeJS.Timeout | null = null

/**
 * Get current RabbitMQ connection status
 */
const getConnectionStatus = ():
  | 'connected'
  | 'disconnected'
  | 'reconnecting' => {
  if (rabbitMQClient.isConnected) return 'connected'
  if (rabbitMQClient.state === 'error') {
    return 'reconnecting'
  }
  return 'disconnected'
}

/**
 * Assess queue health based on metrics
 */
const assessQueueHealth = (
  messageCount: number,
  consumerCount: number,
  isMainQueue: boolean,
): 'healthy' | 'warning' | 'critical' => {
  if (isMainQueue) {
    // Main queue health assessment
    if (consumerCount === 0) return 'critical' // No consumers
    if (messageCount > 1000) return 'critical' // Too many pending messages
    if (messageCount > 100) return 'warning' // High message count
    if (consumerCount < 2) return 'warning' // Low consumer count
    return 'healthy'
  }

  // Dead letter queue health assessment
  if (messageCount > 100) return 'critical' // Too many failed messages
  if (messageCount > 10) return 'warning' // Some failed messages
  return 'healthy'
}

/**
 * Perform a single health check
 */
const performHealthCheck = async (): Promise<void> => {
  const start = Date.now()
  const checkTime = new Date().toISOString()

  try {
    const connectionStatus = getConnectionStatus()

    // Get queue health information
    const queueHealth = await rabbitMQClient.getQueueHealth()
    const latency = Date.now() - start

    // Assess queue health
    const mainQueueStatus = assessQueueHealth(
      queueHealth.mainQueue.messageCount,
      queueHealth.mainQueue.consumerCount,
      true,
    )

    const dlqStatus = assessQueueHealth(
      queueHealth.deadLetterQueue.messageCount,
      queueHealth.deadLetterQueue.consumerCount,
      false,
    )

    // Determine overall health status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'

    if (
      !queueHealth.isConnected ||
      mainQueueStatus === 'critical' ||
      dlqStatus === 'critical'
    ) {
      overallStatus = 'unhealthy'
    } else if (
      mainQueueStatus === 'warning' ||
      dlqStatus === 'warning' ||
      latency > 1000
    ) {
      overallStatus = 'degraded'
    }

    metrics = {
      status: overallStatus,
      latency,
      lastCheck: checkTime,
      connectionStatus,
      queueMetrics: {
        mainQueue: {
          messageCount: queueHealth.mainQueue.messageCount,
          consumerCount: queueHealth.mainQueue.consumerCount,
          status: mainQueueStatus,
        },
        deadLetterQueue: {
          messageCount: queueHealth.deadLetterQueue.messageCount,
          consumerCount: queueHealth.deadLetterQueue.consumerCount,
          status: dlqStatus,
        },
      },
    }

    logger.info({
      msg: 'RabbitMQ health check passed',
      event: 'rabbitmq_health_check_success',
      metadata: {
        latency,
        status: metrics.status,
        connectionStatus,
        mainQueue: {
          messageCount: queueHealth.mainQueue.messageCount,
          consumerCount: queueHealth.mainQueue.consumerCount,
          status: mainQueueStatus,
        },
        deadLetterQueue: {
          messageCount: queueHealth.deadLetterQueue.messageCount,
          consumerCount: queueHealth.deadLetterQueue.consumerCount,
          status: dlqStatus,
        },
      },
    })

    // Send alerts for critical issues
    if (mainQueueStatus === 'critical' || dlqStatus === 'critical') {
      sendSlackNotification({
        channel: 'tech_monitoring',
        text: `🚨 RabbitMQ critical issue detected - Main Queue: ${mainQueueStatus}, DLQ: ${dlqStatus}, Messages: ${queueHealth.mainQueue.messageCount}, Consumers: ${queueHealth.mainQueue.consumerCount}`,
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
      queueMetrics: {
        mainQueue: {
          messageCount: 0,
          consumerCount: 0,
          status: 'critical',
        },
        deadLetterQueue: {
          messageCount: 0,
          consumerCount: 0,
          status: 'critical',
        },
      },
    }

    sendSlackNotification({
      channel: 'tech_monitoring',
      text: `🚨 RabbitMQ health check failed - connection error: ${errorMessage}`,
    })

    logger.error({
      msg: 'RabbitMQ health check failed',
      event: 'rabbitmq_health_check_error',
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
      msg: 'RabbitMQ health monitor is already running',
      event: 'rabbitmq_health_monitor_already_running',
    })
    return
  }

  isRunning = true
  logger.info({
    msg: 'Starting RabbitMQ health monitor',
    event: 'rabbitmq_health_monitor_started',
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
    msg: 'Stopped RabbitMQ health monitor',
    event: 'rabbitmq_health_monitor_stopped',
  })
}

/**
 * Get current health metrics
 */
const getMetrics = (): HealthMetrics => {
  return { ...metrics }
}

/**
 * Check if RabbitMQ is healthy
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

  // Connection recommendations
  if (metrics.connectionStatus !== 'connected') {
    recommendations.push(
      'RabbitMQ connection is not stable - check network and configuration',
    )
  }

  // Latency recommendations
  if (metrics.latency > 1000) {
    recommendations.push(
      'RabbitMQ latency is high - consider optimizing or scaling',
    )
  }

  // Main queue recommendations
  if (metrics.queueMetrics.mainQueue.status === 'critical') {
    if (metrics.queueMetrics.mainQueue.consumerCount === 0) {
      recommendations.push(
        'No consumers for main queue - check if enrichment workers are running',
      )
    }
    if (metrics.queueMetrics.mainQueue.messageCount > 1000) {
      recommendations.push(
        'Too many pending messages in main queue - consider scaling workers',
      )
    }
  } else if (metrics.queueMetrics.mainQueue.status === 'warning') {
    if (metrics.queueMetrics.mainQueue.messageCount > 100) {
      recommendations.push(
        'High message count in main queue - monitor worker performance',
      )
    }
    if (metrics.queueMetrics.mainQueue.consumerCount < 2) {
      recommendations.push('Low consumer count - consider adding more workers')
    }
  }

  // Dead letter queue recommendations
  if (metrics.queueMetrics.deadLetterQueue.status === 'critical') {
    recommendations.push(
      'Too many failed messages in dead letter queue - investigate processing errors',
    )
  } else if (metrics.queueMetrics.deadLetterQueue.status === 'warning') {
    recommendations.push(
      'Some failed messages in dead letter queue - monitor for processing issues',
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
const createRabbitMQHealthMonitor = (): HealthMonitor => ({
  start,
  stop,
  getMetrics,
  isHealthy,
  getHealthReport,
})

// Export singleton instance
export const rabbitMQHealthMonitor = createRabbitMQHealthMonitor()
