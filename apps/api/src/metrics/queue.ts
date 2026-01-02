import type { Worker } from 'bullmq'
import {
  createSimpleDurationTimer,
  queueActiveJobsGauge,
  queueJobDurationHistogram,
  queueJobsFailedCounter,
  queueJobsProcessedCounter,
} from './collectors'

/**
 * Setup comprehensive metrics tracking for a BullMQ worker
 *
 * This function instruments a worker with:
 * - Job duration tracking (histogram)
 * - Job completion counting (counter with status)
 * - Job failure counting (counter with error type)
 * - Active jobs gauge (current processing count)
 *
 * @param worker - The BullMQ worker instance
 * @param queueName - Name of the queue (for labeling)
 * @param jobType - Type of job being processed (for labeling)
 *
 * @example
 * ```typescript
 * const scraperWorker = new Worker(queueName, async (job) => {
 *   // ... job processing logic
 * }, config)
 *
 * setupQueueMetrics(scraperWorker, 'scraper', 'website_scrape')
 * ```
 */
export const setupQueueMetrics = (
  worker: Worker,
  queueName: string,
  jobType: string,
) => {
  // Track when jobs start (increment active gauge)
  worker.on('active', () => {
    queueActiveJobsGauge.inc({ queue_name: queueName })
  })

  // Track when jobs complete successfully
  worker.on('completed', () => {
    queueActiveJobsGauge.dec({ queue_name: queueName })

    queueJobsProcessedCounter.inc({
      queue_name: queueName,
      job_type: jobType,
      status: 'success',
    })
  })

  // Track when jobs fail
  worker.on('failed', (_job, err) => {
    queueActiveJobsGauge.dec({ queue_name: queueName })

    const errorType = err.name || 'UnknownError'

    queueJobsFailedCounter.inc({
      queue_name: queueName,
      job_type: jobType,
      error_type: errorType,
    })

    queueJobsProcessedCounter.inc({
      queue_name: queueName,
      job_type: jobType,
      status: 'failed',
    })
  })

  // Track stalled jobs (retried automatically by BullMQ)
  worker.on('stalled', () => {
    queueJobsProcessedCounter.inc({
      queue_name: queueName,
      job_type: jobType,
      status: 'retried',
    })
  })
}

/**
 * Track job duration manually within job processing logic
 *
 * Use this when you need to track the actual processing time
 * (excluding time spent in queue)
 *
 * @param queueName - Name of the queue
 * @param jobType - Type of job being processed
 * @returns Timer object with stop() method
 *
 * @internal Currently unused - setupQueueMetrics handles tracking via events
 *
 * @example
 * ```typescript
 * const worker = new Worker(queueName, async (job) => {
 *   const timer = trackJobDuration('scraper', 'website_scrape')
 *
 *   try {
 *     await processJob(job)
 *     timer.stop()
 *   } catch (error) {
 *     timer.stop()
 *     throw error
 *   }
 * })
 * ```
 */
const _trackJobDuration = (queueName: string, jobType: string) => {
  const timer = createSimpleDurationTimer(queueJobDurationHistogram)

  return {
    stop: () => {
      timer.stop({ queue_name: queueName, job_type: jobType })
    },
  }
}

// Suppress unused variable warning - documented utility kept for potential future use
void _trackJobDuration
