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
