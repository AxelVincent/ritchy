import { Queue, QueueEvents } from 'bullmq'
import type {
  PeopleSearchParams,
  PeopleSearchResponse,
} from '../../../../../external/contactout/people_search'
import { bullmqRedisOptions } from '../../../config'

export const queueName = 'contactout-people-search'
export const contactoutPeopleSearchQueue = new Queue(queueName, {
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

const contactoutPeopleSearchQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueContactoutPeopleSearchJob = async (
  data: PeopleSearchParams,
): Promise<PeopleSearchResponse> => {
  const job = await contactoutPeopleSearchQueue.add('peopleSearch', data)
  return await job.waitUntilFinished(contactoutPeopleSearchQueueEvents)
}
