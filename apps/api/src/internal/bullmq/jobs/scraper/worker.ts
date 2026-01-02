import { logger } from '@ritchy/logger'
import { UnrecoverableError, Worker } from 'bullmq'
import { setupQueueMetrics } from '../../../../metrics/queue'
import { scrapeWebsiteManager } from '../../../../services/enrichment/scraper/scrape_website_manager'
import { bullmqRedisOptions, workerConfig } from '../../config'
import { extractErrorMessage } from '../../utils/extract-error-message'
import { queueName } from './queue'

export interface ScraperJobData {
  url: string
  enrichmentId: string
  onlyMainContent: boolean
  userPlaceId: string
}

const scraperWorker = new Worker<ScraperJobData>(
  queueName,
  async (job) => {
    const { url, enrichmentId, onlyMainContent, userPlaceId } = job.data

    try {
      logger.info({
        msg: 'Starting scraper job',
        metadata: { jobId: job.id, url },
        event: 'scraper_started',
      })

      const result = await scrapeWebsiteManager(
        url,
        enrichmentId,
        onlyMainContent,
        userPlaceId,
      )

      logger.info({
        msg: 'Scraper job completed',
        metadata: { jobId: job.id },
        event: 'scraper_completed',
      })

      return result
    } catch (error) {
      const errorMessage = extractErrorMessage(error)

      logger.error({
        msg: 'Scraper job failed',
        metadata: {
          jobId: job.id,
          url,
          error: errorMessage,
        },
        event: 'scraper_failed',
      })

      throw new UnrecoverableError(errorMessage)
    }
  },
  {
    connection: bullmqRedisOptions,
    limiter: {
      max: 1000,
      duration: 60000,
    },
    concurrency: workerConfig.scraper.concurrency,
    lockDuration: workerConfig.scraper.lockDuration,
    lockRenewTime: workerConfig.scraper.renewalInterval,
    stalledInterval: workerConfig.scraper.stalledInterval,
    maxStalledCount: workerConfig.scraper.maxStalledCount,
  },
)

logger.info({
  msg: 'Scraper worker initialized',
  event: 'worker_initialized',
  metadata: {
    queue: queueName,
    concurrency: workerConfig.scraper.concurrency,
  },
})

setupQueueMetrics(scraperWorker, 'scraper', 'website_scrape')

scraperWorker.on('active', (job) => {
  logger.info({
    msg: 'Scraper job started',
    event: 'scraper_active',
    metadata: { jobId: job.id, url: job.data.url },
  })
})

scraperWorker.on('completed', (job) => {
  logger.info({
    msg: 'Scraper job completed',
    event: 'scraper_success',
    metadata: { jobId: job.id },
  })
})

scraperWorker.on('failed', (job, err) => {
  logger.error({
    msg: 'Scraper job failed',
    event: 'scraper_error',
    metadata: { jobId: job?.id, error: err.message, stack: err.stack },
  })
})

scraperWorker.on('error', (err) => {
  logger.error({
    msg: 'Scraper worker error',
    event: 'scraper_worker_error',
    metadata: { error: err.message, stack: err.stack },
  })
})

scraperWorker.on('stalled', (jobId) => {
  logger.warn({
    msg: 'Scraper job stalled',
    event: 'scraper_stalled',
    metadata: { jobId },
  })
})
