import { Queue, QueueEvents } from 'bullmq'
import type {
  SubscriptionInformationParams,
  SubscriptionInformationResponse,
} from '../../../../../external/icypeas/subscription_information'
import { bullmqRedisOptions } from '../../../config'

export const queueName = 'icypeas-subscription-information'
export const icypeasSubscriptionInformationQueue = new Queue(queueName, {
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

const icypeasSubscriptionInformationQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueIcypeasSubscriptionInformationJob = async (
  data: SubscriptionInformationParams,
): Promise<SubscriptionInformationResponse> => {
  const job = await icypeasSubscriptionInformationQueue.add(
    'subscriptionInformation',
    data,
  )
  return await job.waitUntilFinished(icypeasSubscriptionInformationQueueEvents)
}
