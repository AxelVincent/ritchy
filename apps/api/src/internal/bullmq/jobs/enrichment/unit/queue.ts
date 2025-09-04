import { Queue, QueueEvents } from 'bullmq'
import { bullmqRedisOptions } from '../../../config'

export const queueName = 'enrichment-unit'
export const enrichmentUnitQueue = new Queue(queueName, {
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

const enrichmentUnitQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueEnrichmentUnitJob = async (
  userPlaceId: string,
): Promise<void> => {
  const job = await enrichmentUnitQueue.add(queueName, { userPlaceId })
  return await job.waitUntilFinished(enrichmentUnitQueueEvents)
}
