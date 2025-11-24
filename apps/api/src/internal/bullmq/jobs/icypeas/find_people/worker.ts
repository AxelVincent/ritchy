import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import type { FindPeopleParams } from '../../../../../external/icypeas/find_people'
import { findPeople } from '../../../../../external/icypeas/find_people'
import { setupQueueMetrics } from '../../../../../metrics/queue'
import { bullmqRedisOptions, workerConfig } from '../../../config'
import { queueName } from './queue'

const icypeasFindPeopleWorker = new Worker(
  queueName,
  async (job) => {
    try {
      const data = job.data as FindPeopleParams

      logger.info({
        msg: 'Starting Icypeas Find People job',
        event: 'icypeas_find_people_job_started',
        metadata: {
          jobId: job.id,
          hasQuery: !!data.query,
          paginationSize: data.pagination?.size,
        },
      })

      const result = await findPeople(data)

      logger.info({
        msg: 'Icypeas Find People job completed successfully',
        event: 'icypeas_find_people_job_completed',
        metadata: {
          jobId: job.id,
          success: result.success,
          total: result.total,
          peopleFound: result.leads.length,
          hasToken: !!result.pagination?.token,
          paginationSize: result.pagination?.size,
        },
      })

      return result
    } catch (error) {
      logger.error({
        msg: 'Icypeas Find People job failed',
        event: 'icypeas_find_people_job_error',
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
    concurrency: workerConfig.icypeas_find_people.concurrency,
    lockDuration: workerConfig.icypeas_find_people.lockDuration,
    lockRenewTime: workerConfig.icypeas_find_people.renewalInterval,
    stalledInterval: workerConfig.icypeas_find_people.stalledInterval,
    maxStalledCount: workerConfig.icypeas_find_people.maxStalledCount,
    limiter: {
      max: 10, // Adjust based on Icypeas rate limits for this endpoint
      duration: 1000,
    },
  },
)

setupQueueMetrics(icypeasFindPeopleWorker, 'icypeas_find_people', 'find_people')

icypeasFindPeopleWorker.on('completed', (job) => {
  logger.info({
    msg: 'Icypeas Find People job completed',
    event: 'icypeas_find_people_job_success',
    metadata: { jobId: job.id },
  })
})

icypeasFindPeopleWorker.on('failed', (job, err) => {
  logger.error({
    msg: 'Icypeas Find People job failed',
    event: 'icypeas_find_people_job_failure',
    metadata: { jobId: job?.id, error: err.message },
  })
})
