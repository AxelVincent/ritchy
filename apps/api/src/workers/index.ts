import 'dotenv/config'

import { logger } from '@ritchy/logger'
import { WORKER_NAMES } from '../internal/bullmq/workers'
import {
  startSequenceCleanup,
  stopSequenceCleanup,
} from '../internal/redis/pubsub'
import { startQueueMonitor, stopQueueMonitor } from '../metrics/queue-monitor'
import { ensureRegistryInitialized, getRegistry } from '../metrics/singleton'
import {
  startStatusManagerCleanup,
  stopStatusManagerCleanup,
} from '../services/enrichment/status_manager'

/**
 * Dedicated worker process for ALL BullMQ jobs.
 *
 * This process runs separately from the main API server, providing:
 * - True process isolation (separate memory space, no event loop blocking)
 * - Independent scaling (run multiple worker processes)
 * - Crash isolation (worker crashes don't affect API server)
 *
 * Usage:
 *   Development: pnpm dev:workers
 *   Production:  pnpm start:workers
 */

// Set worker ID environment variable for the singleton to use
process.env.WORKER_ID = `worker-${process.pid}`

// Initialize aggregated metrics registry (auto-initializing singleton)
// This allows worker metrics to be aggregated with API metrics
ensureRegistryInitialized()

logger.info({
  msg: 'Starting worker process with aggregated metrics',
  event: 'worker_process_start',
  metadata: {
    pid: process.pid,
    workerId: process.env.WORKER_ID,
    nodeVersion: process.version,
    workerCount: WORKER_NAMES.length,
  },
})

logger.info({
  msg: 'All workers initialized',
  event: 'worker_process_ready',
  metadata: {
    workers: WORKER_NAMES,
  },
})

// Start memory cleanup schedulers
startStatusManagerCleanup()
startSequenceCleanup()

// Start queue metrics monitor (polls queue depths and memory every 15s)
startQueueMonitor('worker')

logger.info({
  msg: 'Memory cleanup schedulers and queue monitor started',
  event: 'worker_cleanup_schedulers_started',
})

// Graceful shutdown handlers
const shutdown = async (signal: string) => {
  logger.info({
    msg: `Received ${signal}, shutting down workers`,
    event: 'worker_process_shutdown',
  })

  // Stop memory cleanup schedulers and queue monitor
  stopStatusManagerCleanup()
  stopSequenceCleanup()
  await stopQueueMonitor()

  // Final sync of aggregated metrics before shutdown
  const registry = getRegistry()
  if (registry) {
    try {
      await registry.sync()
      registry.stopSync()
      logger.info({
        msg: 'Final metrics sync completed',
        event: 'worker_metrics_sync_complete',
      })
    } catch (error) {
      logger.error({
        msg: 'Failed to sync metrics during shutdown',
        event: 'worker_metrics_shutdown_error',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }

  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('uncaughtException', (error) => {
  logger.error({
    msg: 'Uncaught exception in worker process',
    event: 'worker_uncaught_exception',
    metadata: { error: error.message, stack: error.stack },
  })
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  logger.error({
    msg: 'Unhandled rejection in worker process',
    event: 'worker_unhandled_rejection',
    metadata: { reason },
  })
})
