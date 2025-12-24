import { logger } from '@ritchy/logger'

/**
 * Batch exit strategy for memory management.
 *
 * BullMQ reuses worker threads/processes indefinitely, causing memory accumulation.
 * This utility tracks job count per process and exits after N jobs to release
 * accumulated memory while minimizing startup overhead.
 *
 * @param maxJobs - Number of jobs to process before exiting (default: 10)
 * @returns Object with increment function to call after each job
 *
 * @example
 * ```typescript
 * const batchExit = createBatchExit(10)
 *
 * export default async function (job) {
 *   try {
 *     // ... process job ...
 *     return result
 *   } finally {
 *     batchExit.afterJob('my_worker')
 *   }
 * }
 * ```
 */
export const createBatchExit = (maxJobs = 10) => {
  let jobCount = 0

  return {
    /**
     * Call this in the finally block after each job.
     * Will exit the process after maxJobs have been processed.
     *
     * @param workerName - Name of the worker for logging
     */
    afterJob: (workerName: string) => {
      jobCount++
      if (jobCount >= maxJobs) {
        logger.info({
          msg: 'Batch exit threshold reached, terminating process for memory cleanup',
          event: `${workerName}_batch_exit`,
          metadata: { jobCount, maxJobs },
        })
        setImmediate(() => process.exit(0))
      }
    },

    /** Current job count (for logging) */
    getJobCount: () => jobCount,
  }
}
