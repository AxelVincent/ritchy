import { Queue, QueueEvents } from 'bullmq'
import type { InternationalCompanyResponse } from '../../../../external/pappers/international_company_v1'
import type { InternationalCompanyV1Params } from '../../../../external/pappers/international_company_v1'
import type {
  InterantionalSearchV1,
  InternationalSearchResponse,
} from '../../../../external/pappers/international_search_v1'
import { bullmqRedisOptions } from '../../config'

export const queueName = 'pappers-api'
export const pappersQueue = new Queue(queueName, {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 300, // 5 minutes
      count: 20, // Reduced from 100 to limit memory usage
    },
    removeOnFail: {
      age: 3600, // 1 hour
      count: 20, // Reduced from 100 to limit memory usage
    },
  },
})

const pappersQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueuePappersSearchJob = async (
  data: InterantionalSearchV1,
): Promise<InternationalSearchResponse> => {
  const job = await pappersQueue.add('search', {
    type: 'search',
    data,
  })
  return await job.waitUntilFinished(pappersQueueEvents)
}

export const enqueuePappersCompanyJob = async (
  data: InternationalCompanyV1Params,
): Promise<InternationalCompanyResponse> => {
  const job = await pappersQueue.add('company', {
    type: 'company',
    data,
  })
  return await job.waitUntilFinished(pappersQueueEvents)
}
