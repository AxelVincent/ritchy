import { Queue, QueueEvents } from 'bullmq'
import type { MillionVerifierResponse } from '../../../../external/million_verifier'
import { bullmqRedisOptions } from '../../config'

const queueName = 'million-verifier'
export const millionVerifierQueue = new Queue(queueName, {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 1,
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

export const millionVerifierQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueMillionVerifierJob = async (
  email: string,
): Promise<MillionVerifierResponse> => {
  const job = await millionVerifierQueue.add('million-verifier', { email })
  return await job.waitUntilFinished(millionVerifierQueueEvents)
}
