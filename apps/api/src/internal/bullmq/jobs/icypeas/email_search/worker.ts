import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import type { EmailSearchParams } from '../../../../../external/icypeas/email_search'
import { emailSearch } from '../../../../../external/icypeas/email_search'
import { bullmqRedisOptions, workerConfig } from '../../../config'
import { queueName } from './queue'

const icypeasEmailSearchWorker = new Worker(
  queueName,
  async (job) => {
    try {
      const data = job.data as EmailSearchParams

      logger.info({
        msg: 'Starting Icypeas email search job',
        event: 'icypeas_email_search_job_started',
        metadata: {
          jobId: job.id,
          firstname: data.firstname,
          lastname: data.lastname,
          domainOrCompany: data.domainOrCompany,
        },
      })

      const result = await emailSearch(data)

      return result
    } catch (error) {
      logger.error({
        msg: 'Icypeas email search job failed',
        event: 'icypeas_email_search_job_error',
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
    concurrency: workerConfig.icypeas_email_search.concurrency,
    lockDuration: workerConfig.icypeas_email_search.lockDuration,
    lockRenewTime: workerConfig.icypeas_email_search.renewalInterval,
    stalledInterval: workerConfig.icypeas_email_search.stalledInterval,
    maxStalledCount: workerConfig.icypeas_email_search.maxStalledCount,
    limiter: {
      max: 10, // 10 calls per second (per Icypeas rate limits)
      duration: 1000,
    },
  },
)

icypeasEmailSearchWorker.on('completed', (job) => {
  logger.info({
    msg: 'Icypeas email search job completed',
    event: 'icypeas_email_search_job_success',
    metadata: { jobId: job.id },
  })
})

icypeasEmailSearchWorker.on('failed', (job, err) => {
  logger.error({
    msg: 'Icypeas email search job failed',
    event: 'icypeas_email_search_job_failure',
    metadata: { jobId: job?.id, error: err.message },
  })
})
