import { Queue, QueueEvents } from 'bullmq'
import type {
  ProfileUrlSearchParams,
  ProfileUrlSearchResponse,
} from '../../../../../external/icypeas/profile_url_search'
import { bullmqRedisOptions } from '../../../config'
import { checkIcypeasCredits } from '../check_credits'

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
      age: 300, // 5 minutes
      count: 100,
    },
    removeOnFail: {
      age: 3600, // 1 hour
      count: 100,
    },
  },
})

const icypeasProfileUrlSearchQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueIcypeasProfileUrlSearchJob = async (
  data: ProfileUrlSearchParams,
): Promise<ProfileUrlSearchResponse> => {
  // Check credits before enqueueing
  await checkIcypeasCredits()

  const job = await icypeasProfileUrlSearchQueue.add('profileUrlSearch', data)
  return await job.waitUntilFinished(icypeasProfileUrlSearchQueueEvents)
}
