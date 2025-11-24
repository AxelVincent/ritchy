import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import type { PeopleSearchParams } from '../../../../../external/contactout/people_search'
import { peopleSearch } from '../../../../../external/contactout/people_search'
import { setupQueueMetrics } from '../../../../../metrics/queue'
import { bullmqRedisOptions, workerConfig } from '../../../config'
import { queueName } from './queue'

const contactoutPeopleSearchWorker = new Worker(
  queueName,
  async (job) => {
    try {
      const data = job.data as PeopleSearchParams

      logger.info({
        msg: 'Starting ContactOut people search job',
        event: 'contactout_people_search_job_started',
        metadata: {
          jobId: job.id,
          name: data.name,
          hasFilters: !!(
            data.company ||
            data.jobTitle ||
            data.location ||
            data.skills
          ),
        },
      })

      const result = await peopleSearch(data)

      logger.info({
        msg: 'ContactOut people search job completed successfully',
        event: 'contactout_people_search_job_completed',
        metadata: {
          jobId: job.id,
          totalResults: result.metadata.total_results,
          profilesCount: Object.keys(result.profiles).length,
        },
      })

      return result
    } catch (error) {
      logger.error({
        msg: 'ContactOut people search job failed',
        event: 'contactout_people_search_job_error',
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
    concurrency: workerConfig.contactout_people_search.concurrency,
    lockDuration: workerConfig.contactout_people_search.lockDuration,
    lockRenewTime: workerConfig.contactout_people_search.renewalInterval,
    stalledInterval: workerConfig.contactout_people_search.stalledInterval,
    maxStalledCount: workerConfig.contactout_people_search.maxStalledCount,
    limiter: {
      max: 60, // 60 requests per minute (per ContactOut API rate limits)
      duration: 60000, // 1 minute
    },
  },
)

setupQueueMetrics(contactoutPeopleSearchWorker, 'contactout', 'people_search')

contactoutPeopleSearchWorker.on('completed', (job) => {
  logger.info({
    msg: 'ContactOut people search job completed',
    event: 'contactout_people_search_job_success',
    metadata: { jobId: job.id },
  })
})

contactoutPeopleSearchWorker.on('failed', (job, err) => {
  logger.error({
    msg: 'ContactOut people search job failed',
    event: 'contactout_people_search_job_failure',
    metadata: { jobId: job?.id, error: err.message },
  })
})
