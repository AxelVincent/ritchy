import { logger } from '@ritchy/logger'
import { websiteEnrichmentManager } from 'apps/api/src/services/enrichment/website_enrichment_manager'
import { type Job, Worker } from 'bullmq'
import { bullmqRedisOptions, workerConfig } from '../../../config'

export interface EnrichmentUnitJobData {
  userPlaceId: string
}

const processEnrichmentUnitJob = async (job: Job<EnrichmentUnitJobData>) => {
  const { userPlaceId } = job.data
  await websiteEnrichmentManager({ userPlaceId })
}

const worker = new Worker<EnrichmentUnitJobData>(
  'enrichment-unit',
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
