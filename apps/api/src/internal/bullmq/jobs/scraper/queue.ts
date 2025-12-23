import { Queue } from 'bullmq'
import { bullmqRedisOptions } from '../../config'
import { pollJobResult } from '../../utils/poll-job-result'

export const queueName = 'scraper'
export const scraperQueue = new Queue(queueName, {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: {
      age: 300, // 5 minutes
      count: 100,
    },
    removeOnFail: {
      age: 3600, // 1 hour
      count: 100,
    },
  },
})

/**
 * Enqueue a scraper job and wait for it to complete using polling.
 *
 * Uses polling instead of QueueEvents.waitUntilFinished() to support
 * being called from within BullMQ worker threads (useWorkerThreads: true).
 * QueueEvents requires IPC channels that don't work in worker thread context.
 */
export const enqueueScraperJob = async (
  url: string,
  enrichmentId: string,
  onlyMainContent: boolean,
  userPlaceId: string,
) => {
  const job = await scraperQueue.add(queueName, {
    url,
    enrichmentId,
    onlyMainContent,
    userPlaceId,
  })

  // Use polling instead of waitUntilFinished for worker thread compatibility
  const jobId = job.id
  if (!jobId) {
    throw new Error('Failed to enqueue scraper job: no job ID returned')
  }

  return await pollJobResult(scraperQueue, jobId, {
    interval: 200, // Poll every 200ms
    timeout: 300000, // 5 minute timeout
  })
}
