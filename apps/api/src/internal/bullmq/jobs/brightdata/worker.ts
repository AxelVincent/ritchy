import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import { webUnblocker } from '../../../../external/brightdata/web_unlocker'
import { bullmqRedisOptions, workerConfig } from '../../config'
import { createLockRenewal } from '../../utils/lock-renewal'
import { queueName } from './queue'

// Configuration for Brightdata worker timeout
const BRIGHTDATA_TIMEOUT_MS = 120000 // 2 minutes
const BRIGHTDATA_LOCK_DURATION_MS = 60000 // 60 seconds
const BRIGHTDATA_RENEWAL_INTERVAL_MS = 30000 // 30 seconds

const brightdataWorker = new Worker(
  queueName,
  async (job) => {
    const { setupLockRenewal, cleanupLockRenewal } = createLockRenewal(
      job,
      queueName,
      {
        maxDuration: BRIGHTDATA_TIMEOUT_MS,
        renewalInterval: BRIGHTDATA_RENEWAL_INTERVAL_MS,
        lockDuration: BRIGHTDATA_LOCK_DURATION_MS,
      },
    )

    try {
      const { url } = job.data

      // Start lock renewal with timeout
      setupLockRenewal()

      const result = await webUnblocker(url)

      // Check if the request was successful based on status code
      const isSuccess = result.status_code >= 200 && result.status_code < 300

      // Clean up lock renewal
      cleanupLockRenewal()

      return {
        ...result,
        success: isSuccess,
        error: isSuccess ? undefined : `HTTP ${result.status_code}`,
      }
    } catch (error) {
      // Clean up lock renewal on error
      cleanupLockRenewal()

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
    concurrency: workerConfig.brightdata.concurrency,
    lockDuration: BRIGHTDATA_LOCK_DURATION_MS,
    lockRenewTime: BRIGHTDATA_RENEWAL_INTERVAL_MS,
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
