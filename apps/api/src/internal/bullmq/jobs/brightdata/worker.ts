import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import { webUnblocker } from '../../../../external/brightdata/web_unlocker'
import { bullmqRedisOptions } from '../../config'

const brightdataWorker = new Worker(
  'brightdata-api',
  async (job) => {
    try {
      const { url } = job.data
      const result = await webUnblocker(url)

      // Check if the request was successful based on status code
      const isSuccess = result.status_code >= 200 && result.status_code < 300

      return {
        ...result,
        success: isSuccess,
        error: isSuccess ? undefined : `HTTP ${result.status_code}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
  {
    connection: bullmqRedisOptions,
    limiter: {
      max: 1000,
      duration: 60000,
    },
    concurrency: 1000,
  },
)

brightdataWorker.on('completed', (job) => {
  logger.info({
    msg: 'Brightdata job completed',
    event: 'brightdata_success',
    metadata: { jobId: job.id },
  })
})

brightdataWorker.on('failed', (job, err) => {
  logger.error({
    msg: 'Brightdata job failed',
    event: 'brightdata_error',
    metadata: { jobId: job?.id, error: err.message },
  })
})
