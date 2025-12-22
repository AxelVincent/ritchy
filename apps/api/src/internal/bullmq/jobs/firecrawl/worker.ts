import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import { getFirecrawlClient } from '../../../../external/firecrawl'
import {
  createSimpleDurationTimer,
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../../../metrics/collectors'
import { setupQueueMetrics } from '../../../../metrics/queue'
import { bullmqRedisOptions, workerConfig } from '../../config'

const TIMEOUT = 30000
const worker = new Worker(
  'firecrawl-api',
  async (job) => {
    const { url, options } = job.data
    const app = getFirecrawlClient()
    const metricsTimer = createSimpleDurationTimer(externalApiDurationHistogram)
    let statusCode = '500'

    try {
      const result = await app.scrapeUrl(url, {
        ...options,
        maxAge: 604800000,
        timeout: TIMEOUT,
      })

      statusCode = result.success ? '200' : '400'
      metricsTimer.stop({ service: 'firecrawl', endpoint: 'scrape' })
      externalApiRequestsCounter.inc({
        service: 'firecrawl',
        endpoint: 'scrape',
        status_code: statusCode,
      })

      return result
    } catch (error) {
      metricsTimer.stop({ service: 'firecrawl', endpoint: 'scrape' })
      externalApiRequestsCounter.inc({
        service: 'firecrawl',
        endpoint: 'scrape',
        status_code: statusCode,
      })
      throw error
    }
  },
  {
    connection: bullmqRedisOptions,
    limiter: {
      max: 500,
      duration: 60000,
    },
    concurrency: workerConfig.firecrawl.concurrency,
    lockDuration: workerConfig.firecrawl.lockDuration,
    lockRenewTime: workerConfig.firecrawl.renewalInterval,
    stalledInterval: workerConfig.firecrawl.stalledInterval,
    maxStalledCount: workerConfig.firecrawl.maxStalledCount,
  },
)

setupQueueMetrics(worker, 'firecrawl', 'web_scrape')

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
