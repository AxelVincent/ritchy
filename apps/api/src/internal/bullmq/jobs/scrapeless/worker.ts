import { logger } from '@ritchy/logger'
import { getScrapelessClient } from 'apps/api/src/external/scrapeless'
import { Worker } from 'bullmq'
import { bullmqRedisOptions } from '../../config'
import { worker } from '../firecrawl/worker'

const TIMEOUT = 30000
export const scrapelessWorker = new Worker(
  'scrapeless-api',
  async (job) => {
    const { url, options } = job.data
    const client = getScrapelessClient()
    return client.scrapeUrl(url, {
      ...options,
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
    msg: 'Scrapeless job completed',
    event: 'scrapeless_success',
    metadata: { jobId: job.id },
  })
})

worker.on('failed', (job, err) => {
  logger.error({
    msg: 'Scrapeless job failed',
    event: 'scrapeless_error',
    metadata: { jobId: job?.id, error: err.message },
  })
})
