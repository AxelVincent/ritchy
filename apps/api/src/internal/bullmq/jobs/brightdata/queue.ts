import { logger } from '@ritchy/logger'
import { Queue, QueueEvents } from 'bullmq'
import type { BrightdataWebUnlockerResponse } from '../../../../external/brightdata/web_unlocker'
import { bullmqRedisOptions } from '../../config'
import { extractErrorMessage } from '../../utils/extract-error-message'

export const queueName = 'brightdata-api'
export const brightdataQueue = new Queue(queueName, {
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

export const brightdataQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueBrightdataJob = async (
  url: string,
): Promise<BrightdataWebUnlockerResponse> => {
  const job = await brightdataQueue.add('brightdata-api', { url })

  try {
    return await job.waitUntilFinished(brightdataQueueEvents)
  } catch (error) {
    const errorMessage = extractErrorMessage(error)

    logger.error({
      msg: '[Brightdata Queue] Job failed',
      event: 'brightdata_queue_job_failed',
      metadata: {
        url,
        jobId: job.id,
        error: errorMessage,
      },
    })

    return {
      status_code: 500,
      success: false,
      error: errorMessage,
      headers: {},
      body: '',
    }
  }
}
