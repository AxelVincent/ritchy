import { logger } from '@ritchy/logger'
import { scrapeWebsiteManager } from 'apps/api/src/services/enrichment/scraper/scrape_website_manager'
import { type Job, Worker } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

const scraperWorker = new Worker(
  'scraper',
  async (job: Job) => {
    const { url, enrichmentId, onlyMainContent, userPlaceId } = job.data
    return await scrapeWebsiteManager(
      url,
      enrichmentId,
      onlyMainContent,
      userPlaceId,
    )
  },
  {
    connection: bullmqRedisOptions,
    limiter: {
      max: 1000,
      duration: 60000,
    },
    concurrency: 200,
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
