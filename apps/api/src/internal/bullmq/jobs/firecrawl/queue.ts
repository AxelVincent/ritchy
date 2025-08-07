import { Queue, QueueEvents } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

const queueName = 'firecrawl-api'
export const firecrawlQueue = new Queue(queueName, {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
})

export const firecrawlQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})
