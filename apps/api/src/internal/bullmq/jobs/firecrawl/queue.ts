import type { CrawlScrapeOptions } from '@mendable/firecrawl-js'
import { Queue, QueueEvents } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

const queueName = 'firecrawl-api'
export const firecrawlQueue = new Queue(queueName, {
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

export const firecrawlQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueFirecrawlJob = async (
  url: string,
  options: CrawlScrapeOptions = {
    formats: ['markdown', 'html', 'rawHtml'],
    excludeTags: ['img'],
    location: {
      country: 'US',
    },
    onlyMainContent: false,
  },
) => {
  const job = await firecrawlQueue.add('firecrawl-api', { url, options })
  return await job.waitUntilFinished(firecrawlQueueEvents)
}
