import { logger } from '@ritchy/logger'
import { scrapeWebsiteManager } from 'apps/api/src/services/enrichment/scraper/scrape_website_manager'
import { type Job, UnrecoverableError, Worker } from 'bullmq'
import { bullmqRedisOptions } from '../../config'
import { workerConfig } from '../../config'
import { queueName } from './queue'

const scraperWorker = new Worker(
  queueName,
  async (job: Job) => {
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
        msg: 'Scraper job completed successfully',
        metadata: { jobId: job.id },
        event: 'scraper_completed',
      })

      return result
    } catch (error) {
      if (error instanceof UnrecoverableError) {
        logger.error({
          msg: 'Scraper job timed out',
          metadata: {
            jobId: job.id,
            url,
            error: error instanceof Error ? error.message : String(error),
          },
          event: 'scraper_timeout',
        })
        throw error
      }
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
    lockDuration: workerConfig.scraper.lockDuration,
    lockRenewTime: workerConfig.scraper.renewalInterval,
    stalledInterval: workerConfig.scraper.stalledInterval,
    maxStalledCount: workerConfig.scraper.maxStalledCount,
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
