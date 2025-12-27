import { logger } from '@ritchy/logger'

/**
 * Attempts to trigger garbage collection if available.
 *
 * Requires Node.js to be started with --expose-gc flag.
 * If gc() is not available, logs a warning once and silently continues.
 *
 * Usage:
 *   tryGarbageCollect('scraper', job.id)
 */
let gcWarningLogged = false

export const tryGarbageCollect = (workerName: string, jobId?: string): void => {
  if (typeof global.gc === 'function') {
    const before = process.memoryUsage().heapUsed
    global.gc()
    const after = process.memoryUsage().heapUsed
    const freedMB = ((before - after) / 1024 / 1024).toFixed(2)

    logger.debug({
      msg: 'Garbage collection completed',
      event: `${workerName}_gc_completed`,
      metadata: {
        jobId,
        freedMB,
        heapUsedAfterMB: (after / 1024 / 1024).toFixed(2),
      },
    })
  } else if (!gcWarningLogged) {
    gcWarningLogged = true
    logger.warn({
      msg: 'global.gc() not available. Start Node.js with --expose-gc flag for manual GC.',
      event: 'gc_not_available',
      metadata: { workerName },
    })
  }
}
