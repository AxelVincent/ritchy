import { Queue, QueueEvents } from 'bullmq'
import type {
  FindPeopleParams,
  FindPeopleResponse,
} from '../../../../../external/icypeas/find_people'
import { bullmqRedisOptions } from '../../../config'
import { checkIcypeasCredits } from '../check_credits'

export const queueName = 'icypeas-find-people'
export const icypeasFindPeopleQueue = new Queue(queueName, {
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

const icypeasFindPeopleQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueIcypeasFindPeopleJob = async (
  data: FindPeopleParams,
): Promise<FindPeopleResponse> => {
  // Check credits before enqueueing
  await checkIcypeasCredits()

  const job = await icypeasFindPeopleQueue.add('findPeople', data)
  return await job.waitUntilFinished(icypeasFindPeopleQueueEvents)
}
