import { Queue, QueueEvents } from 'bullmq'
import type {
  ProfileUrlSearchParams,
  ProfileUrlSearchResponse,
} from '../../../../../external/icypeas/profile_url_search'
import { bullmqRedisOptions } from '../../../config'

export const queueName = 'icypeas-profile-url-search'
export const icypeasProfileUrlSearchQueue = new Queue(queueName, {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600,
      count: 1000,
    },
    removeOnFail: {
      age: 24 * 3600,
      count: 1000,
    },
  },
})

const icypeasProfileUrlSearchQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueIcypeasProfileUrlSearchJob = async (
  data: ProfileUrlSearchParams,
): Promise<ProfileUrlSearchResponse> => {
  const job = await icypeasProfileUrlSearchQueue.add('profileUrlSearch', data)
  return await job.waitUntilFinished(icypeasProfileUrlSearchQueueEvents)
}
