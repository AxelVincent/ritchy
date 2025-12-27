import { logger } from '@ritchy/logger'
import { Queue } from 'bullmq'
import { bullmqRedisOptions } from '../internal/bullmq/config'
import {
  processHeapUsedGauge,
  processMemoryGauge,
  queueDelayedJobsGauge,
  queueWaitingJobsGauge,
} from './collectors'

/**
 * Queue definitions for monitoring.
 * Maps queue names to their BullMQ Queue instances.
 */
const MONITORED_QUEUES = [
  'scraper',
  'enrichment-company',
  'enrichment-contact',
  'brightdata',
  'contactout-people-search',
  'firecrawl',
  'forager-phone-lookup',
  'forager-user-information',
  'google-places',
  'icypeas-email-search',
  'icypeas-find-people',
  'icypeas-profile-url-search',
  'icypeas-subscription-information',
  'million-verifier',
  'pappers',
  'whois',
] as const

let monitorInterval: NodeJS.Timeout | null = null
let queues: Map<string, Queue> | null = null

/**
 * Collect queue depth metrics for all monitored queues.
 */
const collectQueueMetrics = async () => {
  if (!queues) return

  for (const [queueName, queue] of queues) {
    try {
      const [waiting, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getDelayedCount(),
      ])

      queueWaitingJobsGauge.set(waiting, { queue_name: queueName })
      queueDelayedJobsGauge.set(delayed, { queue_name: queueName })
    } catch (error) {
      logger.warn({
        msg: `Failed to collect queue metrics for ${queueName}`,
        event: 'queue_metrics_error',
        metadata: {
          queueName,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }
}

/**
 * Collect process memory metrics.
 */
const collectMemoryMetrics = (processType: string) => {
  const memUsage = process.memoryUsage()

  processMemoryGauge.set(memUsage.rss, { process_type: processType })
  processHeapUsedGauge.set(memUsage.heapUsed, { process_type: processType })
}

/**
 * Start the queue monitor.
 * Polls queue depths and memory usage at regular intervals.
 *
 * @param processType - Label for the process type (e.g., 'worker', 'api')
 * @param intervalMs - Polling interval in milliseconds (default: 15000)
 */
export const startQueueMonitor = (
  processType: string,
  intervalMs = 15000,
): void => {
  if (monitorInterval) {
    logger.warn({
      msg: 'Queue monitor already running',
      event: 'queue_monitor_already_running',
    })
    return
  }

  // Initialize queue instances
  queues = new Map(
    MONITORED_QUEUES.map((name) => [
      name,
      new Queue(name, { connection: bullmqRedisOptions }),
    ]),
  )

  // Collect immediately on start
  collectQueueMetrics()
  collectMemoryMetrics(processType)

  // Then poll at interval
  monitorInterval = setInterval(async () => {
    await collectQueueMetrics()
    collectMemoryMetrics(processType)
  }, intervalMs)

  logger.info({
    msg: 'Queue monitor started',
    event: 'queue_monitor_started',
    metadata: {
      processType,
      intervalMs,
      queueCount: MONITORED_QUEUES.length,
    },
  })
}

/**
 * Stop the queue monitor and cleanup resources.
 */
export const stopQueueMonitor = async (): Promise<void> => {
  if (monitorInterval) {
    clearInterval(monitorInterval)
    monitorInterval = null
  }

  if (queues) {
    // Close all queue connections
    await Promise.all(Array.from(queues.values()).map((queue) => queue.close()))
    queues = null
  }

  logger.info({
    msg: 'Queue monitor stopped',
    event: 'queue_monitor_stopped',
  })
}
