import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import { setupQueueMetrics } from '../../../../metrics/queue'
import { bullmqRedisOptions, workerConfig } from '../../config'
import { getSandboxPath } from '../../utils/sandbox-path'
import { queueName } from './queue'
import type { ScraperJobData } from './sandbox'

const sandboxPath = getSandboxPath('jobs/scraper/sandbox')

/**
 * Scraper worker with worker thread isolation.
 *
 * Most memory-intensive worker due to Cheerio/JSDOM usage.
 * Uses useWorkerThreads for memory isolation - each job runs in a separate
 * thread, preventing memory spikes from affecting other workers.
 */
const scraperWorker = new Worker<ScraperJobData>(queueName, sandboxPath, {
  connection: bullmqRedisOptions,
  useWorkerThreads: true,
  // Prevent --expose-gc from being inherited by worker threads (not allowed in Node.js worker_threads)
  workerThreadsOptions: {
    execArgv: [],
  },
  limiter: {
    max: 1000,
    duration: 60000,
  },
  concurrency: workerConfig.scraper.concurrency,
  lockDuration: workerConfig.scraper.lockDuration,
  lockRenewTime: workerConfig.scraper.renewalInterval,
  stalledInterval: workerConfig.scraper.stalledInterval,
  maxStalledCount: workerConfig.scraper.maxStalledCount,
})

logger.info({
  msg: 'Scraper worker initialized',
  event: 'worker_initialized',
  metadata: {
    queue: queueName,
    useWorkerThreads: true,
    concurrency: workerConfig.scraper.concurrency,
  },
})

setupQueueMetrics(scraperWorker, 'scraper', 'website_scrape')

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
