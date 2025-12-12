import { Queue, QueueEvents } from 'bullmq'
import type { UserInformationResponse } from '../../../../../external/forager/user_information'
import { bullmqRedisOptions } from '../../../config'

export const queueName = 'forager-user-information'
export const foragerUserInformationQueue = new Queue(queueName, {
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

const foragerUserInformationQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueForagerUserInformationJob =
  async (): Promise<UserInformationResponse> => {
    const job = await foragerUserInformationQueue.add('userInformation', {})
    return await job.waitUntilFinished(foragerUserInformationQueueEvents)
  }
