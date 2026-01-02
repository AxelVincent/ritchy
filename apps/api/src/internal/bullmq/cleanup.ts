import { logger } from '@ritchy/logger'
import { bullmqQueues } from './index'

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const COMPLETED_JOB_MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes
const FAILED_JOB_MAX_AGE_MS = 60 * 60 * 1000 // 1 hour
const MAX_JOBS_TO_CLEAN = 1000

/** @internal Called by the scheduler - not exported */
const cleanupAllQueues = async (): Promise<void> => {
  const results = await Promise.allSettled(
    bullmqQueues.map(async ({ queue, displayName }) => {
      const completedCleaned = await queue.clean(
        COMPLETED_JOB_MAX_AGE_MS,
        MAX_JOBS_TO_CLEAN,
        'completed',
      )
      const failedCleaned = await queue.clean(
        FAILED_JOB_MAX_AGE_MS,
        MAX_JOBS_TO_CLEAN,
        'failed',
      )

      return {
        displayName,
        completedCleaned: completedCleaned.length,
        failedCleaned: failedCleaned.length,
      }
    }),
  )

  const successfulCleanups = results
    .filter(
      (
        r,
      ): r is PromiseFulfilledResult<{
        displayName: string
        completedCleaned: number
        failedCleaned: number
      }> => r.status === 'fulfilled',
    )
    .map((r) => r.value)

  const totalCompleted = successfulCleanups.reduce(
    (sum, r) => sum + r.completedCleaned,
    0,
  )
  const totalFailed = successfulCleanups.reduce(
    (sum, r) => sum + r.failedCleaned,
    0,
  )

  if (totalCompleted > 0 || totalFailed > 0) {
    logger.info({
      msg: 'BullMQ queue cleanup completed',
      event: 'bullmq_cleanup_success',
      metadata: {
        totalCompletedJobsCleaned: totalCompleted,
        totalFailedJobsCleaned: totalFailed,
        queueResults: successfulCleanups,
      },
    })
  }

  const failedCleanups = results.filter((r) => r.status === 'rejected')
  if (failedCleanups.length > 0) {
    logger.error({
      msg: 'Some queue cleanups failed',
      event: 'bullmq_cleanup_error',
      metadata: {
        failedCount: failedCleanups.length,
        errors: failedCleanups.map((r) =>
          r.status === 'rejected' ? String(r.reason) : '',
        ),
      },
    })
  }
}

let cleanupIntervalId: NodeJS.Timeout | null = null

export const startQueueCleanupScheduler = (): void => {
  if (cleanupIntervalId) {
    logger.warn({
      msg: 'Queue cleanup scheduler already running',
      event: 'bullmq_cleanup_scheduler_already_running',
    })
    return
  }

  // Run initial cleanup
  cleanupAllQueues().catch((error) => {
    logger.error({
      msg: 'Initial queue cleanup failed',
      event: 'bullmq_cleanup_initial_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
  })

  // Schedule periodic cleanup
  cleanupIntervalId = setInterval(() => {
    cleanupAllQueues().catch((error) => {
      logger.error({
        msg: 'Scheduled queue cleanup failed',
        event: 'bullmq_cleanup_scheduled_error',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
    })
  }, CLEANUP_INTERVAL_MS)

  logger.info({
    msg: 'BullMQ queue cleanup scheduler started',
    event: 'bullmq_cleanup_scheduler_started',
    metadata: { intervalMs: CLEANUP_INTERVAL_MS },
  })
}

export const stopQueueCleanupScheduler = (): void => {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId)
    cleanupIntervalId = null
    logger.info({
      msg: 'BullMQ queue cleanup scheduler stopped',
      event: 'bullmq_cleanup_scheduler_stopped',
    })
  }
}
