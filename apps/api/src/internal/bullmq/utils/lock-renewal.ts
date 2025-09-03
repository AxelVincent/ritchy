import { logger } from '@ritchy/logger'
import type { Job } from 'bullmq'

interface LockRenewalOptions {
  /** Maximum time in milliseconds to allow lock renewal */
  maxDuration?: number
  /** Interval in milliseconds between lock renewals */
  renewalInterval?: number
  /** Lock duration in milliseconds */
  lockDuration?: number
}

export const createLockRenewal = (
  job: Job,
  workerName: string,
  options: LockRenewalOptions = {},
) => {
  const {
    maxDuration = 300000, // 5 minutes default
    renewalInterval = 30000, // 30 seconds default
    lockDuration = 60000, // 60 seconds default
  } = options

  let lockRenewalInterval: NodeJS.Timeout | null = null
  let timeoutId: NodeJS.Timeout | null = null
  const startTime = Date.now()

  const setupLockRenewal = () => {
    // Set up the main timeout to prevent infinite renewal
    timeoutId = setTimeout(() => {
      logger.warn({
        msg: `Lock renewal timeout reached for ${workerName} job`,
        event: `${workerName}_lock_timeout`,
        metadata: {
          jobId: job.id,
          duration: Date.now() - startTime,
          maxDuration,
        },
      })
      cleanupLockRenewal()
    }, maxDuration)

    // Set up periodic lock renewal
    lockRenewalInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime

      // Check if we've exceeded the maximum duration
      if (elapsed >= maxDuration) {
        logger.warn({
          msg: `Stopping lock renewal for ${workerName} job - max duration exceeded`,
          event: `${workerName}_lock_max_duration_exceeded`,
          metadata: {
            jobId: job.id,
            elapsed,
            maxDuration,
          },
        })
        cleanupLockRenewal()
        return
      }

      try {
        await job.extendLock(`${workerName}-processing`, lockDuration)
        logger.debug({
          msg: `Lock renewed for ${workerName} job`,
          event: `${workerName}_lock_renewed`,
          metadata: {
            jobId: job.id,
            elapsed,
            remaining: maxDuration - elapsed,
          },
        })
      } catch (error) {
        logger.warn({
          msg: `Failed to renew lock for ${workerName} job`,
          event: `${workerName}_lock_renewal_error`,
          metadata: {
            jobId: job.id,
            elapsed,
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }, renewalInterval)
  }

  const cleanupLockRenewal = () => {
    if (lockRenewalInterval) {
      clearInterval(lockRenewalInterval)
      lockRenewalInterval = null
    }
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return { setupLockRenewal, cleanupLockRenewal }
}
