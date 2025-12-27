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
      age: 300, // 5 minutes
      count: 20, // Reduced from 100 to limit memory usage
    },
    removeOnFail: {
      age: 3600, // 1 hour
      count: 20, // Reduced from 100 to limit memory usage
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
