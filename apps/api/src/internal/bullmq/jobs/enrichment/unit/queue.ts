import { Queue, QueueEvents } from 'bullmq'
import { bullmqRedisOptions } from '../../../config'

export const enrichmentUnitQueue = new Queue('enrichment-unit', {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 300,
      count: 1000,
    },
    removeOnFail: false,
  },
})

export const enrichmentUnitQueueEvents = new QueueEvents('enrichment-unit', {
  connection: bullmqRedisOptions,
})
