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

const scraperQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

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
  return await job.waitUntilFinished(scraperQueueEvents)
}
