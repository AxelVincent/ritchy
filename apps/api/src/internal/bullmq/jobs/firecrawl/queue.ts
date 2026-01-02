import type { CrawlScrapeOptions } from '@mendable/firecrawl-js'
import { Queue } from 'bullmq'
import { bullmqRedisOptions } from '../../config'
import { pollJobResult } from '../../utils/poll-job-result'

const queueName = 'firecrawl-api'
export const firecrawlQueue = new Queue(queueName, {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: {
      age: 300, // 5 minutes
      count: 20, // Reduced from 100 to limit memory usage
    },
    removeOnFail: {
      age: 3600, // 1 hour
      count: 20, // Reduced from 100 to limit memory usage
    },
  },
})

// NOTE: Removed firecrawlQueueEvents - using pollJobResult instead
// QueueEvents creates a persistent Redis connection that leaks memory

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

  if (!job.id) {
    throw new Error('Failed to create firecrawl job - no job ID returned')
  }

  // Use polling instead of QueueEvents to avoid memory leaks
  return await pollJobResult(firecrawlQueue, job.id, {
    interval: 200,
    timeout: 300000, // 5 minutes
  })
}
