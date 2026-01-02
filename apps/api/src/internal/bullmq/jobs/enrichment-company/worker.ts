import { logger } from '@ritchy/logger'
import { UnrecoverableError, Worker } from 'bullmq'
import { setupQueueMetrics } from '../../../../metrics/queue'
import { companyEnrichmentService } from '../../../../services/enrichment/company_enrichment_service'
import { setCompanyEnrichmentStatus } from '../../../../services/enrichment/status_manager'
import { bullmqRedisOptions, workerConfig } from '../../config'
import { extractErrorMessage } from '../../utils/extract-error-message'
import { type CompanyEnrichmentJobData, queueName } from './queue'

const worker = new Worker<CompanyEnrichmentJobData>(
  queueName,
  async (job) => {
    const { userPlaceId, enrichmentId, placeId, userId } = job.data

    logger.info({
      msg: 'Company enrichment job started',
      event: 'company_enrichment_start',
      metadata: {
        jobId: job.id,
        userPlaceId,
        enrichmentId,
      },
    })

    try {
      await setCompanyEnrichmentStatus(
        userPlaceId,
        'processing',
        'Starting company enrichment',
        0,
      )

      await companyEnrichmentService({
        userPlaceId,
        enrichmentId,
        placeId,
        userId,
      })

      logger.info({
        msg: 'Company enrichment job completed',
        event: 'company_enrichment_complete',
        metadata: {
          jobId: job.id,
          userPlaceId,
          enrichmentId,
        },
      })

      return { success: true, enrichmentId }
    } catch (error) {
      const errorMessage = extractErrorMessage(error)

      await setCompanyEnrichmentStatus(
        userPlaceId,
        'failed',
        errorMessage,
        100,
        errorMessage,
      )

      logger.error({
        msg: 'Company enrichment job failed',
        event: 'company_enrichment_error',
        metadata: {
          jobId: job.id,
          userPlaceId,
          error: errorMessage,
        },
      })

      throw new UnrecoverableError(errorMessage)
    }
  },
  {
    connection: bullmqRedisOptions,
    limiter: {
      max: 100,
      duration: 60000,
    },
    concurrency: workerConfig.enrichment_company.concurrency,
    lockDuration: workerConfig.enrichment_company.lockDuration,
    lockRenewTime: workerConfig.enrichment_company.renewalInterval,
    stalledInterval: workerConfig.enrichment_company.stalledInterval,
    maxStalledCount: workerConfig.enrichment_company.maxStalledCount,
  },
)

logger.info({
  msg: 'Company enrichment worker initialized',
  event: 'worker_initialized',
  metadata: {
    queue: queueName,
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
