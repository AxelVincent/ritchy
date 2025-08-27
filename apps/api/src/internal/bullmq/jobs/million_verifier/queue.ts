import type { MillionVerifierResponse } from 'apps/api/src/external/million_verifier'
import { Queue, QueueEvents } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

const queueName = 'million-verifier'
export const millionVerifierQueue = new Queue(queueName, {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: 'exponential',
      delay: 1000,
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
