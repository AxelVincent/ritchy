import { logger } from '@ritchy/logger'
import { UnrecoverableError, Worker } from 'bullmq'
import { setupQueueMetrics } from '../../../../metrics/queue'
import { contactEnrichmentService } from '../../../../services/enrichment/contact/service'
import { setContactEnrichmentStatus } from '../../../../services/enrichment/shared/status/status_manager'
import { bullmqRedisOptions, workerConfig } from '../../config'
import { extractErrorMessage } from '../../utils/extract-error-message'
import { type ContactEnrichmentJobData, queueName } from './queue'

const worker = new Worker<ContactEnrichmentJobData>(
  queueName,
  async (job) => {
    const { contactId, userPlaceId, userId } = job.data

    try {
      await setContactEnrichmentStatus(
        contactId,
        'processing',
        'Starting contact enrichment',
        0,
      )

      await job.updateProgress({
        step: 'Starting contact enrichment',
        percent: 0,
      })

      // Service returns rich data for external API use
      const result = await contactEnrichmentService({
        contactId,
        userPlaceId,
        userId,
      })

      await job.updateProgress({
        step: 'Contact enrichment completed',
        percent: 100,
      })

      return {
        success: result.success,
        contactId,
        alreadyEnriched: result.alreadyEnriched,
        data: result.data,
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error)

      await setContactEnrichmentStatus(
        contactId,
        'failed',
        errorMessage,
        100,
        errorMessage,
      )

      logger.error({
        msg: 'Contact enrichment job failed',
        event: 'contact_enrichment_error',
        metadata: {
          jobId: job.id,
          contactId,
          error: errorMessage,
        },
      })

      throw new UnrecoverableError(errorMessage)
    }
  },
  {
    connection: bullmqRedisOptions,
    limiter: {
      max: 200,
      duration: 60000,
    },
    concurrency: workerConfig.enrichment_contact.concurrency,
    lockDuration: workerConfig.enrichment_contact.lockDuration,
    lockRenewTime: workerConfig.enrichment_contact.renewalInterval,
    stalledInterval: workerConfig.enrichment_contact.stalledInterval,
    maxStalledCount: workerConfig.enrichment_contact.maxStalledCount,
  },
)

logger.info({
  msg: 'Contact enrichment worker initialized',
  event: 'worker_initialized',
  metadata: {
    queue: queueName,
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
