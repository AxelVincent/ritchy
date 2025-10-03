import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import type { InternationalCompanyV1Params } from '../../../../external/pappers/international_company_v1'
import { internationalCompanyV1 } from '../../../../external/pappers/international_company_v1'
import type { InterantionalSearchV1 } from '../../../../external/pappers/international_search_v1'
import { internationalSearchV1 } from '../../../../external/pappers/international_search_v1'
import { bullmqRedisOptions, workerConfig } from '../../config'
import { queueName } from './queue'

// Define job types for type safety
type PappersJobData =
  | { type: 'search'; data: InterantionalSearchV1 }
  | { type: 'company'; data: InternationalCompanyV1Params }

const pappersWorker = new Worker(
  queueName,
  async (job) => {
    try {
      const { type, data } = job.data as PappersJobData

      switch (type) {
        case 'search':
          return await internationalSearchV1(data)

        case 'company':
          return await internationalCompanyV1(data)

        default:
          throw new Error(`Unknown job type: ${type}`)
      }
    } catch (error) {
      logger.error({
        msg: 'Pappers API job failed',
        event: 'pappers_job_error',
        metadata: {
          jobId: job.id,
          jobType: (job.data as PappersJobData).type,
          error: error instanceof Error ? error.message : String(error),
        },
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
  {
    connection: bullmqRedisOptions,
    concurrency: workerConfig.pappers.concurrency,
    lockDuration: workerConfig.pappers.lockDuration,
    lockRenewTime: workerConfig.pappers.renewalInterval,
    stalledInterval: workerConfig.pappers.stalledInterval,
    maxStalledCount: workerConfig.pappers.maxStalledCount,
    limiter: {
      max: 500,
      duration: 60000,
    },
  },
)

pappersWorker.on('completed', (job) => {
  const jobType = (job.data as PappersJobData).type
  logger.info({
    msg: 'Pappers API job completed',
    event: 'pappers_job_success',
    metadata: { jobId: job.id, jobType },
  })
})

pappersWorker.on('failed', (job, err) => {
  const jobType = job?.data ? (job.data as PappersJobData).type : 'unknown'
  logger.error({
    msg: 'Pappers API job failed',
    event: 'pappers_job_failure',
    metadata: { jobId: job?.id, jobType, error: err.message },
  })
})
