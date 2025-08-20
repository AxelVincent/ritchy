import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import { getFirecrawlClient } from '../../../../external/firecrawl'
import { bullmqRedisOptions } from '../../config'

const TIMEOUT = 30000
export const worker = new Worker(
  'firecrawl-api',
  async (job) => {
    const { url, options } = job.data
    const app = getFirecrawlClient()
    return app.scrapeUrl(url, {
      ...options,
      maxAge: 604800000,
      timeout: TIMEOUT,
    })
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

worker.on('completed', (job) => {
  logger.info({
    msg: 'Firecrawl job completed',
    event: 'firecrawl_success',
    metadata: { jobId: job.id },
  })
})

worker.on('failed', (job, err) => {
  logger.error({
    msg: 'Firecrawl job failed',
    event: 'firecrawl_error',
    metadata: { jobId: job?.id, error: err.message },
  })
})
