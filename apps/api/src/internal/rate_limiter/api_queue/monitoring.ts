import { logger } from '@ritchy/logger'
import type { RateLimiterMetrics } from '../index'

type QueueMetrics = {
  name: string
  concurrency: number
  activeRequests: number
  totalProcessed: number
  averageResponseTime: number
  errorRate: number
  lastError?: {
    message: string
    timestamp: number
  }
}

type MonitorConfig = {
  name: string
  rateLimiter: {
    getMetrics: () => Promise<RateLimiterMetrics>
  }
  concurrency: number
  intervalMs?: number
}

export const createQueueMonitor = (config: MonitorConfig) => {
  const metrics: QueueMetrics = {
    name: config.name,
    concurrency: config.concurrency,
    activeRequests: 0,
    totalProcessed: 0,
    averageResponseTime: 0,
    errorRate: 0,
  }

  let totalErrors = 0
  let totalResponseTime = 0

  const updateMetrics = (responseTime: number, isError: boolean) => {
    metrics.totalProcessed++
    totalResponseTime += responseTime
    metrics.averageResponseTime = totalResponseTime / metrics.totalProcessed

    if (isError) {
      totalErrors++
      metrics.errorRate = (totalErrors / metrics.totalProcessed) * 100
    }
  }

  const startMonitoring = () => {
    const interval = setInterval(
      async () => {
        try {
          const rateLimiterMetrics = await config.rateLimiter.getMetrics()

          logger.info({
            msg: 'API Queue health metrics',
            event: 'api_queue_metrics',
            metadata: {
              queue: {
                name: config.name,
                concurrency: config.concurrency,
                activeRequests: metrics.activeRequests,
                processed: metrics.totalProcessed,
                avgResponseTime: `${Math.round(metrics.averageResponseTime)}ms`,
                errorRate: `${metrics.errorRate.toFixed(2)}%`,
                lastError: metrics.lastError,
              },
              rateLimiter: {
                totalRequests: rateLimiterMetrics.totalRequests,
                queuedRequests: rateLimiterMetrics.queuedRequests,
                averageWaitTime: `${Math.round(rateLimiterMetrics.averageWaitTime)}ms`,
                maxWaitTime: `${rateLimiterMetrics.maxWaitTime}ms`,
              },
              health: {
                status: metrics.errorRate > 10 ? 'degraded' : 'healthy',
                concurrencyHealth:
                  metrics.activeRequests >= config.concurrency
                    ? 'at capacity'
                    : 'normal',
                suggestions: getSuggestions(metrics, rateLimiterMetrics),
              },
            },
          })
        } catch (error) {
          logger.error({
            msg: 'Queue monitoring error',
            event: 'queue_monitor_error',
            metadata: { error, queue: config.name },
          })
        }
      },
      config.intervalMs || 60000 * 5,
    )

    return () => clearInterval(interval)
  }

  return {
    recordRequest: (startTime: number, error?: Error) => {
      const responseTime = Date.now() - startTime
      if (error) {
        metrics.lastError = {
          message: error.message,
          timestamp: Date.now(),
        }
      }
      updateMetrics(responseTime, !!error)
    },
    incrementActive: () => metrics.activeRequests++,
    decrementActive: () => metrics.activeRequests--,
    startMonitoring,
  }
}

// Helper to provide actionable suggestions
const getSuggestions = (
  queueMetrics: QueueMetrics,
  rateLimiterMetrics: RateLimiterMetrics,
): string[] => {
  const suggestions: string[] = []

  if (rateLimiterMetrics.averageWaitTime > 1000) {
    suggestions.push('Consider reducing concurrency to improve wait times')
  }

  if (queueMetrics.activeRequests >= queueMetrics.concurrency * 0.8) {
    suggestions.push('Queue approaching capacity, monitor for bottlenecks')
  }

  if (queueMetrics.errorRate > 5) {
    suggestions.push('Error rate above 5%, investigate error patterns')
  }

  return suggestions
}
