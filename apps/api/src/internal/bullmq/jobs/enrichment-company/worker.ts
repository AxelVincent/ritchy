import { existsSync } from 'node:fs'
import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import { setupQueueMetrics } from '../../../../metrics/queue'
import { bullmqRedisOptions, workerConfig } from '../../config'
import { getSandboxPath } from '../../utils/sandbox-path'
import { type CompanyEnrichmentJobData, queueName } from './queue'

const sandboxPath = getSandboxPath('jobs/enrichment-company/sandbox')

// Debug: Log sandbox path and check if file exists
logger.debug({
  msg: 'Company enrichment worker sandbox path',
  event: 'worker_sandbox_path',
  metadata: {
    sandboxPath,
    fileExists: existsSync(sandboxPath),
  },
})

/**
 * Company enrichment worker with worker thread isolation.
 *
 * Uses useWorkerThreads for memory isolation - each job runs in a separate
 * thread, preventing memory leaks from affecting the main worker process.
 */
const worker = new Worker<CompanyEnrichmentJobData>(queueName, sandboxPath, {
  connection: bullmqRedisOptions,
  useWorkerThreads: true,
  // Prevent --expose-gc from being inherited by worker threads (not allowed in Node.js worker_threads)
  workerThreadsOptions: {
    execArgv: [],
  },
  limiter: {
    max: 100,
    duration: 60000,
  },
  concurrency: workerConfig.enrichment_company.concurrency,
  lockDuration: workerConfig.enrichment_company.lockDuration,
  lockRenewTime: workerConfig.enrichment_company.renewalInterval,
  stalledInterval: workerConfig.enrichment_company.stalledInterval,
  maxStalledCount: workerConfig.enrichment_company.maxStalledCount,
})

logger.info({
  msg: 'Company enrichment worker initialized',
  event: 'worker_initialized',
  metadata: {
    queue: queueName,
    useWorkerThreads: true,
    concurrency: workerConfig.enrichment_company.concurrency,
  },
})

setupQueueMetrics(worker, 'enrichment', 'enrichment_company')

worker.on('active', (job) => {
  logger.info({
    msg: 'Company enrichment job started',
    event: 'company_enrichment_active',
    metadata: { jobId: job.id, userPlaceId: job.data.userPlaceId },
  })
})

worker.on('completed', (job) => {
  logger.info({
    msg: 'Company enrichment job completed',
    event: 'company_enrichment_success',
    metadata: { jobId: job.id, userPlaceId: job.data.userPlaceId },
  })
})

worker.on('failed', (job, err) => {
  logger.error({
    msg: 'Company enrichment job failed',
    event: 'company_enrichment_error',
    metadata: { jobId: job?.id, error: err.message, stack: err.stack },
  })
})

worker.on('error', (err) => {
  logger.error({
    msg: 'Company enrichment worker error',
    event: 'company_enrichment_worker_error',
    metadata: { error: err.message, stack: err.stack },
  })
})

worker.on('stalled', (jobId) => {
  logger.warn({
    msg: 'Company enrichment job stalled',
    event: 'company_enrichment_stalled',
    metadata: { jobId },
  })
})

export { worker as companyEnrichmentWorker }
