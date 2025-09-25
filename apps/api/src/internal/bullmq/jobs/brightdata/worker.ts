import { logger } from '@ritchy/logger'
import { UnrecoverableError, Worker } from 'bullmq'
import { webUnblocker } from '../../../../external/brightdata/web_unlocker'
import { bullmqRedisOptions, workerConfig } from '../../config'
import { queueName } from './queue'

const brightdataWorker = new Worker(
  queueName,
  async (job) => {
    const { url } = job.data

    try {
      const result = await webUnblocker(url)
      const isSuccess = result.status_code >= 200 && result.status_code < 300

      return {
        ...result,
        success: isSuccess,
        error: isSuccess ? undefined : `HTTP ${result.status_code}`,
      }
    } catch (error) {
      if (error instanceof UnrecoverableError) {
        logger.error({
          msg: 'Brightdata job timed out',
          event: 'brightdata_timeout',
          metadata: {
            jobId: job.id,
            url,
            error: error.message,
          },
        })
        // Re-throw UnrecoverableError to mark job as failed
        throw error
      }

      // Handle other errors
      logger.error({
        msg: 'Brightdata job failed with error',
        event: 'brightdata_error',
        metadata: {
          jobId: job.id,
          url,
          error: error instanceof Error ? error.message : String(error),
        },
      })

      throw error
    }
  },
  {
    connection: bullmqRedisOptions,
    limiter: {
      max: 1000,
      duration: 60000,
    },
    concurrency: workerConfig.brightdata.concurrency,
    lockDuration: workerConfig.brightdata.lockDuration,
    lockRenewTime: workerConfig.brightdata.renewalInterval,
    stalledInterval: workerConfig.brightdata.stalledInterval,
    maxStalledCount: workerConfig.brightdata.maxStalledCount,
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
    metadata: {
      jobId: job?.id,
      error: err.message,
      isTimeout: err instanceof UnrecoverableError && err.message === 'Timeout',
    },
  })
})
