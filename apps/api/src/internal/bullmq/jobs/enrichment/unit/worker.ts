import { logger } from '@ritchy/logger'
import { websiteEnrichmentManager } from 'apps/api/src/services/enrichment/website_enrichment_manager'
import { type Job, Worker } from 'bullmq'
import { bullmqRedisOptions, workerConfig } from '../../../config'
import { createLockRenewal } from '../../../utils/lock-renewal'
import { queueName } from './queue'

const ENRICHMENT_UNIT_TIMEOUT_MS = 600000 // 10 minutes
const ENRICHMENT_UNIT_LOCK_DURATION_MS = 120000 // 120 seconds
const ENRICHMENT_UNIT_RENEWAL_INTERVAL_MS = 60000 // 60 seconds

export interface EnrichmentUnitJobData {
  userPlaceId: string
}

const processEnrichmentUnitJob = async (job: Job<EnrichmentUnitJobData>) => {
  const { userPlaceId } = job.data
  const { setupLockRenewal, cleanupLockRenewal } = createLockRenewal(
    job,
    queueName,
    {
      maxDuration: ENRICHMENT_UNIT_TIMEOUT_MS,
      renewalInterval: ENRICHMENT_UNIT_RENEWAL_INTERVAL_MS,
      lockDuration: ENRICHMENT_UNIT_LOCK_DURATION_MS,
    },
  )
  try {
    setupLockRenewal()

    await websiteEnrichmentManager({ userPlaceId })

    cleanupLockRenewal()
  } catch (error) {
    logger.error({
      msg: 'Enrichment unit job failed',
      event: 'enrichment_unit_error',
      metadata: {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
      },
    })
  } finally {
    cleanupLockRenewal()
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
