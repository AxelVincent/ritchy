import { Queue, QueueEvents } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

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
 * Lazy-initialized QueueEvents instance.
 * Created on first use to ensure proper initialization in worker threads.
 * Each worker thread will create its own connection.
 */
let scraperQueueEvents: QueueEvents | null = null

const getScraperQueueEvents = async (): Promise<QueueEvents> => {
  if (!scraperQueueEvents) {
    scraperQueueEvents = new QueueEvents(queueName, {
      connection: bullmqRedisOptions,
    })
    // Wait for the connection to be ready
    await scraperQueueEvents.waitUntilReady()
  }
  return scraperQueueEvents
}

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
  const queueEvents = await getScraperQueueEvents()
  return await job.waitUntilFinished(queueEvents)
}
