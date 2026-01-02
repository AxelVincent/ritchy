import { Queue, QueueEvents } from 'bullmq'
import type { MillionVerifierResponse } from '../../../../external/million_verifier'
import { bullmqRedisOptions } from '../../config'

const queueName = 'million-verifier'
export const millionVerifierQueue = new Queue(queueName, {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 1,
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

export const millionVerifierQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueMillionVerifierJob = async (
  email: string,
): Promise<MillionVerifierResponse> => {
  const job = await millionVerifierQueue.add('million-verifier', { email })
  return await job.waitUntilFinished(millionVerifierQueueEvents)
}
