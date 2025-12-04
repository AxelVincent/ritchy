import { Queue, QueueEvents } from 'bullmq'
import type {
  PhoneLookupParams,
  PhoneLookupResponse,
} from '../../../../../external/forager/phone_lookup'
import { bullmqRedisOptions } from '../../../config'
import { checkForagerCredits } from '../check_credits'

export const queueName = 'forager-phone-lookup'
export const foragerPhoneLookupQueue = new Queue(queueName, {
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

const foragerPhoneLookupQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueForagerPhoneLookupJob = async (
  data: PhoneLookupParams,
): Promise<PhoneLookupResponse> => {
  // Check credits before enqueueing
  await checkForagerCredits()

  const job = await foragerPhoneLookupQueue.add('phoneLookup', data)
  return await job.waitUntilFinished(foragerPhoneLookupQueueEvents)
}
