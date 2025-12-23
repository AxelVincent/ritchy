import { Job } from 'bullmq'
import type { Queue } from 'bullmq'

export interface PollJobOptions {
  /** Polling interval in milliseconds (default: 200ms) */
  interval?: number
  /** Maximum time to wait in milliseconds (default: 5 minutes) */
  timeout?: number
}

/**
 * Poll a BullMQ job until it completes or fails.
 *
 * This is an alternative to `job.waitUntilFinished()` that works in worker
 * threads. It doesn't require QueueEvents, making it safe to use inside
 * sandboxed workers that use `useWorkerThreads: true`.
 *
 * @param queue - The queue the job belongs to
 * @param jobId - The job ID to poll
 * @param options - Polling options
 * @returns The job's return value
 * @throws Error if job fails, times out, or is not found
 */
export const pollJobResult = async <T, R>(
  queue: Queue<T, R>,
  jobId: string,
  options: PollJobOptions = {},
): Promise<R> => {
  const { interval = 200, timeout = 300000 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const job = await Job.fromId<T, R>(queue, jobId)

    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    const state = await job.getState()

    if (state === 'completed') {
      return job.returnvalue
    }

    if (state === 'failed') {
      throw new Error(job.failedReason || `Job ${jobId} failed`)
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(`Job ${jobId} timed out after ${timeout}ms`)
}
