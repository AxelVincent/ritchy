import { Queue, QueueEvents } from 'bullmq'
import type {
  EmailSearchParams,
  EmailSearchResponse,
} from '../../../../../external/icypeas/email_search'
import { bullmqRedisOptions } from '../../../config'
import { checkIcypeasCredits } from '../check_credits'

export const queueName = 'icypeas-email-search'
export const icypeasEmailSearchQueue = new Queue(queueName, {
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

const icypeasEmailSearchQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueIcypeasEmailSearchJob = async (
  data: EmailSearchParams,
): Promise<EmailSearchResponse> => {
  // Check credits before enqueueing
  await checkIcypeasCredits()

  const job = await icypeasEmailSearchQueue.add('emailSearch', data)
  return await job.waitUntilFinished(icypeasEmailSearchQueueEvents)
}
