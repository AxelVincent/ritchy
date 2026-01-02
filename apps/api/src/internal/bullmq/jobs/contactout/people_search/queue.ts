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
      age: 300, // 5 minutes
      count: 20, // Reduced from 100 to limit memory usage
    },
    removeOnFail: {
      age: 3600, // 1 hour
      count: 20, // Reduced from 100 to limit memory usage
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
