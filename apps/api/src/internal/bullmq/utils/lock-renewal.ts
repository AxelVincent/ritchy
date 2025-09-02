import { logger } from '@ritchy/logger'
import type { Job } from 'bullmq'

export const createLockRenewal = (job: Job, workerName: string) => {
  let lockRenewalInterval: NodeJS.Timeout | null = null

  const setupLockRenewal = () => {
    lockRenewalInterval = setInterval(async () => {
      try {
        await job.extendLock(`${workerName}-processing`, 60000)
        logger.debug({
          msg: `Lock renewed for ${workerName} job`,
          event: `${workerName}_lock_renewed`,
          metadata: { jobId: job.id },
        })
      } catch (error) {
        logger.warn({
          msg: `Failed to renew lock for ${workerName} job`,
          event: `${workerName}_lock_renewal_error`,
          metadata: {
            jobId: job.id,
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }, 30000)
  }

  const cleanupLockRenewal = () => {
    if (lockRenewalInterval) {
      clearInterval(lockRenewalInterval)
      lockRenewalInterval = null
    }
  }

  return { setupLockRenewal, cleanupLockRenewal }
}
