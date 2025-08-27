import { Queue, QueueEvents } from 'bullmq'
import type { BrightdataWebUnlockerResponse } from '../../../../external/brightdata/web_unlocker'
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

export const enqueueBrightdataJob = async (
  url: string,
): Promise<BrightdataWebUnlockerResponse> => {
  const job = await brightdataQueue.add('brightdata-api', { url })
  return await job.waitUntilFinished(brightdataQueueEvents)
}
