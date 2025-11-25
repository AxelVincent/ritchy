import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import type { SubscriptionInformationParams } from '../../../../../external/icypeas/subscription_information'
import { getSubscriptionInformation } from '../../../../../external/icypeas/subscription_information'
import { setupQueueMetrics } from '../../../../../metrics/queue'
import { bullmqRedisOptions, workerConfig } from '../../../config'
import { queueName } from './queue'

const icypeasSubscriptionInformationWorker = new Worker(
  queueName,
  async (job) => {
    try {
      const data = job.data as SubscriptionInformationParams

      logger.info({
        msg: 'Starting Icypeas subscription information job',
        event: 'icypeas_subscription_information_job_started',
        metadata: {
          jobId: job.id,
          email: data.email,
        },
      })

      const result = await getSubscriptionInformation(data)

      logger.info({
        msg: 'Icypeas subscription information job completed successfully',
        event: 'icypeas_subscription_information_job_completed',
        metadata: {
          jobId: job.id,
          userId: result.userId,
          plan: result.plan,
          status: result.status,
          credits: result.credits,
          dailyQuota: result.quotas.daily,
        },
      })

      return result
    } catch (error) {
      logger.error({
        msg: 'Icypeas subscription information job failed',
        event: 'icypeas_subscription_information_job_error',
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
    concurrency: workerConfig.icypeas_subscription_information.concurrency,
    lockDuration: workerConfig.icypeas_subscription_information.lockDuration,
    lockRenewTime:
      workerConfig.icypeas_subscription_information.renewalInterval,
    stalledInterval:
      workerConfig.icypeas_subscription_information.stalledInterval,
    maxStalledCount:
      workerConfig.icypeas_subscription_information.maxStalledCount,
    limiter: {
      max: 30, // 30 calls per second (conservative rate limit)
      duration: 1000,
    },
  },
)

setupQueueMetrics(
  icypeasSubscriptionInformationWorker,
  'icypeas_subscription',
  'subscription_check',
)

icypeasSubscriptionInformationWorker.on('completed', (job) => {
  logger.info({
    msg: 'Icypeas subscription information job completed',
    event: 'icypeas_subscription_information_job_success',
    metadata: { jobId: job.id },
  })
})

icypeasSubscriptionInformationWorker.on('failed', (job, err) => {
  logger.error({
    msg: 'Icypeas subscription information job failed',
    event: 'icypeas_subscription_information_job_failure',
    metadata: { jobId: job?.id, error: err.message },
  })
})
