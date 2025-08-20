import { Queue, QueueEvents } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

const queueName = 'brightdata-api'
export const brightdataQueue = new Queue(queueName, {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
})

export const brightdataQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})
