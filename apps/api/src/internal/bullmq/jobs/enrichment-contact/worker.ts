import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import { setupQueueMetrics } from '../../../../metrics/queue'
import { bullmqRedisOptions, workerConfig } from '../../config'
import { getSandboxPath } from '../../utils/sandbox-path'
import { type ContactEnrichmentJobData, queueName } from './queue'

const sandboxPath = getSandboxPath('jobs/enrichment-contact/sandbox')

/**
 * Contact enrichment worker with worker thread isolation.
 *
 * Uses useWorkerThreads for memory isolation - each job runs in a separate
 * thread, preventing memory leaks from affecting the main worker process.
 */
const worker = new Worker<ContactEnrichmentJobData>(queueName, sandboxPath, {
  connection: bullmqRedisOptions,
  useWorkerThreads: true,
  limiter: {
    max: 200,
    duration: 60000,
  },
  concurrency: workerConfig.enrichment_contact.concurrency,
  lockDuration: workerConfig.enrichment_contact.lockDuration,
  lockRenewTime: workerConfig.enrichment_contact.renewalInterval,
  stalledInterval: workerConfig.enrichment_contact.stalledInterval,
  maxStalledCount: workerConfig.enrichment_contact.maxStalledCount,
})

logger.info({
  msg: 'Contact enrichment worker initialized',
  event: 'worker_initialized',
  metadata: {
    queue: queueName,
    useWorkerThreads: true,
    concurrency: workerConfig.enrichment_contact.concurrency,
  },
})

setupQueueMetrics(worker, 'enrichment', 'enrichment_contact')

worker.on('completed', (job) => {
  logger.info({
    msg: 'Contact enrichment job completed',
    event: 'contact_enrichment_success',
    metadata: { jobId: job.id, contactId: job.data.contactId },
  })
})

worker.on('failed', (job, err) => {
  logger.error({
    msg: 'Contact enrichment job failed',
    event: 'contact_enrichment_error',
    metadata: { jobId: job?.id, error: err.message },
  })
})

export { worker as contactEnrichmentWorker }
