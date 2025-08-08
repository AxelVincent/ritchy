import { Queue, QueueEvents } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

const queueName = 'scrapeless-api'
export const scrapelessQueue = new Queue(queueName, {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
})

export const scrapelessQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})
