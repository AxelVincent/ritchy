import { logger } from '@ritchy/logger'
import { Queue } from 'bullmq'
import type { BrightdataWebUnlockerResponse } from '../../../../external/brightdata/web_unlocker'
import { bullmqRedisOptions } from '../../config'
import { extractErrorMessage } from '../../utils/extract-error-message'
import { pollJobResult } from '../../utils/poll-job-result'

export const queueName = 'brightdata-api'
export const brightdataQueue = new Queue(queueName, {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: {
      age: 300, // 5 minutes
      count: 20, // Reduced from 100 to limit memory usage
    },
    removeOnFail: {
      age: 3600, // 1 hour
      count: 20, // Reduced from 100 to limit memory usage
    },
  },
})

// NOTE: Removed brightdataQueueEvents - using pollJobResult instead
// QueueEvents creates a persistent Redis connection that leaks memory

export const enqueueBrightdataJob = async (
  url: string,
): Promise<BrightdataWebUnlockerResponse> => {
  const job = await brightdataQueue.add('brightdata-api', { url })

  if (!job.id) {
    return {
      status_code: 500,
      success: false,
      error: 'Failed to create job - no job ID returned',
      headers: {},
      body: '',
    }
  }

  try {
    // Use polling instead of QueueEvents to avoid memory leaks
    return await pollJobResult(brightdataQueue, job.id, {
      interval: 200,
      timeout: 300000, // 5 minutes
    })
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
