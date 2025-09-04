import { logger } from '@ritchy/logger'
import { scrapeWebsiteManager } from 'apps/api/src/services/enrichment/scraper/scrape_website_manager'
import { type Job, Worker } from 'bullmq'
import { bullmqRedisOptions } from '../../config'
import { workerConfig } from '../../config'
import { createLockRenewal } from '../../utils/lock-renewal'
import { queueName } from './queue'

const SCRAPER_TIMEOUT_MS = 180000 // 3 minutes
const SCRAPER_LOCK_DURATION_MS = 120000 // 120 seconds
const SCRAPER_RENEWAL_INTERVAL_MS = 60000 // 60 seconds

const scraperWorker = new Worker(
  queueName,
  async (job: Job) => {
    const { setupLockRenewal, cleanupLockRenewal } = createLockRenewal(
      job,
      queueName,
      {
        maxDuration: SCRAPER_TIMEOUT_MS,
        renewalInterval: SCRAPER_RENEWAL_INTERVAL_MS,
        lockDuration: SCRAPER_LOCK_DURATION_MS,
      },
    )
    const { url, enrichmentId, onlyMainContent, userPlaceId } = job.data
    try {
      logger.info({
        msg: 'Starting scraper job',
        metadata: { jobId: job.id, url },
        event: 'scraper_started',
      })

      setupLockRenewal()

      const result = await scrapeWebsiteManager(
        url,
        enrichmentId,
        onlyMainContent,
        userPlaceId,
      )

      cleanupLockRenewal()
      logger.info({
        msg: 'Scraper job completed successfully',
        metadata: { jobId: job.id },
        event: 'scraper_completed',
      })

      return result
    } catch (error) {
      cleanupLockRenewal()

      logger.error({
        msg: 'Scraper job failed',
        metadata: {
          jobId: job.id,
          url,
          error: error instanceof Error ? error.message : String(error),
        },
        event: 'scraper_failed',
      })

      throw error
    }
  },
  {
    connection: bullmqRedisOptions,
    limiter: {
      max: 1000,
      duration: 60000,
    },
    concurrency: workerConfig.scraper.concurrency,
    lockDuration: 120000,
    lockRenewTime: 60000,
    stalledInterval: 60000,
    maxStalledCount: 3,
  },
)

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
    metadata: { jobId: job?.id, error: err.message },
  })
})
