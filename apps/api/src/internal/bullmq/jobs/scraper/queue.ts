import { Queue, QueueEvents } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

export const scraperQueue = new Queue('scraper', {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 300,
      count: 1000,
    },
    removeOnFail: false,
  },
})

const scraperQueueEvents = new QueueEvents('scraper', {
  connection: bullmqRedisOptions,
})

export const enqueueScraperJob = async (
  url: string,
  enrichmentId: string,
  onlyMainContent: boolean,
  userPlaceId: string,
) => {
  const job = await scraperQueue.add('scraper', {
    url,
    enrichmentId,
    onlyMainContent,
    userPlaceId,
  })
  return await job.waitUntilFinished(scraperQueueEvents)
}
