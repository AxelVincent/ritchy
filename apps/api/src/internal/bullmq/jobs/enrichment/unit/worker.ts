import { logger } from '@ritchy/logger'
import { websiteEnrichmentManager } from 'apps/api/src/services/enrichment/website_enrichment_manager'
import { type Job, UnrecoverableError, Worker } from 'bullmq'
import { bullmqRedisOptions, workerConfig } from '../../../config'
import { queueName } from './queue'

export interface EnrichmentUnitJobData {
  userPlaceId: string
}

const processEnrichmentUnitJob = async (job: Job<EnrichmentUnitJobData>) => {
  const { userPlaceId } = job.data
  try {
    await websiteEnrichmentManager({ userPlaceId })
  } catch (error) {
    if (error instanceof UnrecoverableError) {
      logger.error({
        msg: 'Enrichment unit job timed out',
        event: 'enrichment_unit_timeout',
        metadata: {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        },
      })
      throw error
    }
    logger.error({
      msg: 'Enrichment unit job failed',
      event: 'enrichment_unit_error',
      metadata: {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

const worker = new Worker<EnrichmentUnitJobData>(
  queueName,
  processEnrichmentUnitJob,
  {
    connection: bullmqRedisOptions,
    limiter: {
      max: 200,
      duration: 60000,
    },
    concurrency: workerConfig.enrichment_unit.concurrency,
    lockDuration: workerConfig.enrichment_unit.lockDuration,
    lockRenewTime: workerConfig.enrichment_unit.renewalInterval,
    stalledInterval: workerConfig.enrichment_unit.stalledInterval,
    maxStalledCount: workerConfig.enrichment_unit.maxStalledCount,
  },
)

worker.on('completed', (job) => {
  const usage = process.memoryUsage()
  if (usage.heapUsed > 512 * 1024 * 1024) {
    logger.warn({
      msg: 'Enrichment unit job completed with high memory usage',
      event: 'enrichment_unit_success_high_memory_usage',
      metadata: { jobId: job.id, usage },
    })
  } else {
    logger.info({
      msg: 'Enrichment unit job completed',
      event: 'enrichment_unit_success',
      metadata: { jobId: job.id, usage },
    })
  }
})

worker.on('failed', (job, err) => {
  logger.error({
    msg: 'Enrichment unit job failed',
    event: 'enrichment_unit_error',
    metadata: { jobId: job?.id, error: err.message },
  })
})
