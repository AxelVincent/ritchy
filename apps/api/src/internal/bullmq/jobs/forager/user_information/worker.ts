import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import { getUserInformation } from '../../../../../external/forager/user_information'
import { setupQueueMetrics } from '../../../../../metrics/queue'
import { bullmqRedisOptions, workerConfig } from '../../../config'
import { queueName } from './queue'

const foragerUserInformationWorker = new Worker(
  queueName,
  async (job) => {
    try {
      logger.info({
        msg: 'Starting Forager user information job',
        event: 'forager_user_information_job_started',
        metadata: {
          jobId: job.id,
        },
      })

      const result = await getUserInformation()

      // Find the account matching our ACCOUNT_ID
      const account = result.accounts.find(
        (acc) => acc.id.toString() === process.env.FORAGER_ACCOUNT_ID,
      )

      logger.info({
        msg: 'Forager user information job completed successfully',
        event: 'forager_user_information_job_completed',
        metadata: {
          jobId: job.id,
          userId: result.id,
          email: result.email,
          accountId: account?.id,
          creditsBalance: account?.subscription.credits_balance,
          isActive: account?.subscription.is_active,
          subscriptionTier: account?.subscription.subscription_tier.name,
        },
      })

      return result
    } catch (error) {
      logger.error({
        msg: 'Forager user information job failed',
        event: 'forager_user_information_job_error',
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
    concurrency: workerConfig.forager_user_information.concurrency,
    lockDuration: workerConfig.forager_user_information.lockDuration,
    lockRenewTime: workerConfig.forager_user_information.renewalInterval,
    stalledInterval: workerConfig.forager_user_information.stalledInterval,
    maxStalledCount: workerConfig.forager_user_information.maxStalledCount,
    limiter: {
      max: 30, // 30 calls per second (conservative rate limit)
      duration: 1000,
    },
  },
)

setupQueueMetrics(foragerUserInformationWorker, 'forager_user', 'user_lookup')

foragerUserInformationWorker.on('completed', (job) => {
  logger.info({
    msg: 'Forager user information job completed',
    event: 'forager_user_information_job_success',
    metadata: { jobId: job.id },
  })
})

foragerUserInformationWorker.on('failed', (job, err) => {
  logger.error({
    msg: 'Forager user information job failed',
    event: 'forager_user_information_job_failure',
    metadata: { jobId: job?.id, error: err.message },
  })
})
