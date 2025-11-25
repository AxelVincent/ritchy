import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import type { PhoneLookupParams } from '../../../../../external/forager/phone_lookup'
import { lookupPhoneNumbers } from '../../../../../external/forager/phone_lookup'
import { setupQueueMetrics } from '../../../../../metrics/queue'
import { bullmqRedisOptions, workerConfig } from '../../../config'
import { queueName } from './queue'

const foragerPhoneLookupWorker = new Worker(
  queueName,
  async (job) => {
    try {
      const data = job.data as PhoneLookupParams

      logger.info({
        msg: 'Starting Forager phone lookup job',
        event: 'forager_phone_lookup_job_started',
        metadata: {
          jobId: job.id,
          personId: data.personId ?? 'not provided',
          linkedinPublicIdentifier: data.linkedinPublicIdentifier,
        },
      })

      const result = await lookupPhoneNumbers(data)

      logger.info({
        msg: 'Forager phone lookup job completed successfully',
        event: 'forager_phone_lookup_job_completed',
        metadata: {
          jobId: job.id,
          phoneNumbersCount: result.length,
        },
      })

      return result
    } catch (error) {
      logger.error({
        msg: 'Forager phone lookup job failed',
        event: 'forager_phone_lookup_job_error',
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
    concurrency: workerConfig.forager_phone_lookup.concurrency,
    lockDuration: workerConfig.forager_phone_lookup.lockDuration,
    lockRenewTime: workerConfig.forager_phone_lookup.renewalInterval,
    stalledInterval: workerConfig.forager_phone_lookup.stalledInterval,
    maxStalledCount: workerConfig.forager_phone_lookup.maxStalledCount,
    limiter: {
      max: 60, // 60 requests per minute (adjust based on Forager API rate limits)
      duration: 60000, // 1 minute
    },
  },
)

setupQueueMetrics(foragerPhoneLookupWorker, 'forager_phone', 'phone_lookup')

foragerPhoneLookupWorker.on('completed', (job) => {
  logger.info({
    msg: 'Forager phone lookup job completed',
    event: 'forager_phone_lookup_job_success',
    metadata: { jobId: job.id },
  })
})

foragerPhoneLookupWorker.on('failed', (job, err) => {
  logger.error({
    msg: 'Forager phone lookup job failed',
    event: 'forager_phone_lookup_job_failure',
    metadata: { jobId: job?.id, error: err.message },
  })
})
