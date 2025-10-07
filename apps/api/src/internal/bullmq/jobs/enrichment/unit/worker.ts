import { logger } from '@ritchy/logger'
import { type Job, UnrecoverableError, Worker } from 'bullmq'
import { setEnrichmentStatus } from '../../../../../services/enrichment/status_manager'
import { websiteEnrichmentManager } from '../../../../../services/enrichment/website_enrichment_manager'
import { bullmqRedisOptions, workerConfig } from '../../../config'
import { jobTracker } from '../../../utils/job_progress_tracker'
import { queueName } from './queue'

export interface EnrichmentUnitJobData {
  userPlaceId: string
}

const processEnrichmentUnitJob = async (job: Job<EnrichmentUnitJobData>) => {
  const { userPlaceId } = job.data
  const jobId = String(job.id)
  try {
    jobTracker.startTracking(jobId)
    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Starting enrichment',
      0,
      jobId,
    )

    jobTracker.updateProgress(jobId, 'Starting enrichment')
    await websiteEnrichmentManager({ userPlaceId, jobId })

    jobTracker.updateProgress(jobId, 'Enrichment completed')
    jobTracker.cleanup(jobId)
  } catch (error) {
    jobTracker.cleanup(jobId)
    if (error instanceof UnrecoverableError) {
      logger.error({
        msg: 'Enrichment unit job timed out',
        event: 'enrichment_unit_timeout',
        metadata: {
          jobId: job.id,
          elapsedMs: jobTracker.getElapsedTime(jobId),
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
    logger.error({
      msg: 'Enrichment unit job failed',
      event: 'enrichment_unit_error',
      metadata: {
        jobId: job.id,
        elapsedMs: jobTracker.getElapsedTime(jobId),
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
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
