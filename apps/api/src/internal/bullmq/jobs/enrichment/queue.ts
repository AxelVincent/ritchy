import { Queue, QueueEvents } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

export const queueName = 'enrichment-unit'
export const enrichmentUnitQueue = new Queue(queueName, {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: {
      age: 300, // 5 minutes
      count: 100,
    },
    removeOnFail: {
      age: 3600, // 1 hour
      count: 100,
    },
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
