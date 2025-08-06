import { Worker } from 'bullmq'
import { bullmqRedisOptions } from '../..'
import { getFirecrawlClient } from '../../../../external/firecrawl'

export const worker = new Worker(
  'firecrawl-api',
  async (job) => {
    const { url, options } = job.data
    const app = getFirecrawlClient()
    return app.scrapeUrl(url, { ...options, timeout: 60000 })
  },
  {
    connection: bullmqRedisOptions,
    limiter: {
      max: 500,
      duration: 60000,
    },
    concurrency: 50,
  },
)
