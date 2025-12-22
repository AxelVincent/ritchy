import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import { setupQueueMetrics } from '../../../../metrics/queue'
import { bullmqRedisOptions, workerConfig } from '../../config'
import { getSandboxPath } from '../../utils/sandbox-path'
import { type CompanyEnrichmentJobData, queueName } from './queue'

const sandboxPath = getSandboxPath('jobs/enrichment-company/sandbox')

/**
 * Company enrichment worker with worker thread isolation.
 *
 * Uses useWorkerThreads for memory isolation - each job runs in a separate
 * thread, preventing memory leaks from affecting the main worker process.
 */
const worker = new Worker<CompanyEnrichmentJobData>(queueName, sandboxPath, {
  connection: bullmqRedisOptions,
  useWorkerThreads: true,
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
    metadata: { jobId: job?.id, error: err.message },
  })
})

export { worker as companyEnrichmentWorker }
