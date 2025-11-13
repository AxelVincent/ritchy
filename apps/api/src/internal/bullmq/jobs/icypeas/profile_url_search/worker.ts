import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import type { ProfileUrlSearchParams } from '../../../../../external/icypeas/profile_url_search'
import { profileUrlSearch } from '../../../../../external/icypeas/profile_url_search'
import { bullmqRedisOptions, workerConfig } from '../../../config'
import { queueName } from './queue'

const icypeasProfileUrlSearchWorker = new Worker(
  queueName,
  async (job) => {
    try {
      const data = job.data as ProfileUrlSearchParams

      logger.info({
        msg: 'Starting Icypeas profile URL search job',
        event: 'icypeas_profile_url_search_job_started',
        metadata: {
          jobId: job.id,
          firstname: data.firstname,
          lastname: data.lastname,
          companyOrDomain: data.companyOrDomain,
          jobTitle: data.jobTitle,
        },
      })

      const result = await profileUrlSearch(data)

      return result
    } catch (error) {
      logger.error({
        msg: 'Icypeas profile URL search job failed',
        event: 'icypeas_profile_url_search_job_error',
        metadata: {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        },
      })

      // Re-throw the error so BullMQ marks the job as failed
      // This prevents the error object from being treated as valid data
      throw error
    }
  },
  {
    connection: bullmqRedisOptions,
    concurrency: workerConfig.icypeas_profile_url_search.concurrency,
    lockDuration: workerConfig.icypeas_profile_url_search.lockDuration,
    lockRenewTime: workerConfig.icypeas_profile_url_search.renewalInterval,
    stalledInterval: workerConfig.icypeas_profile_url_search.stalledInterval,
    maxStalledCount: workerConfig.icypeas_profile_url_search.maxStalledCount,
    limiter: {
      max: 20, // 20 calls per second (per Icypeas rate limits)
      duration: 1000,
    },
  },
)

icypeasProfileUrlSearchWorker.on('completed', (job) => {
  logger.info({
    msg: 'Icypeas profile URL search job completed',
    event: 'icypeas_profile_url_search_job_success',
    metadata: { jobId: job.id },
  })
})

icypeasProfileUrlSearchWorker.on('failed', (job, err) => {
  logger.error({
    msg: 'Icypeas profile URL search job failed',
    event: 'icypeas_profile_url_search_job_failure',
    metadata: { jobId: job?.id, error: err.message },
  })
})
