import { logger } from '@ritchy/logger'

/**
 * Memory snapshot for tracking memory changes.
 */
interface MemorySnapshot {
  rss: number
  heapUsed: number
  heapTotal: number
  external: number
  arrayBuffers: number
}

/**
 * Format bytes to human-readable string.
 */
const formatBytes = (bytes: number): string => {
  const mb = bytes / 1024 / 1024
  return `${mb.toFixed(2)}MB`
}

/**
 * Get current memory snapshot.
 */
export const getMemorySnapshot = (): MemorySnapshot => {
  const mem = process.memoryUsage()
  return {
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external,
    arrayBuffers: mem.arrayBuffers,
  }
}

/**
 * Calculate memory delta between two snapshots.
 */
export const getMemoryDelta = (
  before: MemorySnapshot,
  after: MemorySnapshot,
): Record<string, number> => ({
  rss: after.rss - before.rss,
  heapUsed: after.heapUsed - before.heapUsed,
  heapTotal: after.heapTotal - before.heapTotal,
  external: after.external - before.external,
  arrayBuffers: after.arrayBuffers - before.arrayBuffers,
})

/**
 * Log memory snapshot with formatted output.
 */
export const logMemorySnapshot = (
  event: string,
  workerName: string,
  jobId: string | undefined,
  snapshot: MemorySnapshot,
  delta?: Record<string, number>,
): void => {
  const metadata: Record<string, unknown> = {
    workerName,
    jobId,
    memory: {
      rss: formatBytes(snapshot.rss),
      heapUsed: formatBytes(snapshot.heapUsed),
      heapTotal: formatBytes(snapshot.heapTotal),
      external: formatBytes(snapshot.external),
      arrayBuffers: formatBytes(snapshot.arrayBuffers),
    },
    memoryRaw: {
      rss: snapshot.rss,
      heapUsed: snapshot.heapUsed,
      heapTotal: snapshot.heapTotal,
      external: snapshot.external,
      arrayBuffers: snapshot.arrayBuffers,
    },
  }

  if (delta) {
    metadata.delta = {
      rss: formatBytes(delta.rss),
      heapUsed: formatBytes(delta.heapUsed),
      heapTotal: formatBytes(delta.heapTotal),
      external: formatBytes(delta.external),
      arrayBuffers: formatBytes(delta.arrayBuffers),
    }
    metadata.deltaRaw = delta
  }

  // Log as warning if heap grew significantly (>10MB)
  const heapGrowth = delta?.heapUsed ?? 0
  const logLevel = heapGrowth > 10 * 1024 * 1024 ? 'warn' : 'debug'

  logger[logLevel]({
    msg: `[Memory] ${event}`,
    event: 'memory_tracking',
    metadata,
  })
}

// Maximum age for stale snapshots (10 minutes)
const STALE_SNAPSHOT_TTL_MS = 10 * 60 * 1000
// Maximum number of snapshots before forced cleanup
const MAX_SNAPSHOTS = 1000

interface SnapshotWithTimestamp {
  snapshot: MemorySnapshot
  timestamp: number
}

/**
 * Create a memory tracker for a specific worker.
 * Tracks memory before and after each job.
 * Includes automatic cleanup for stale entries to prevent memory leaks.
 */
export const createMemoryTracker = (workerName: string) => {
  let jobCount = 0
  let totalHeapGrowth = 0
  const jobSnapshots = new Map<string, SnapshotWithTimestamp>()

  /**
   * Clean up stale snapshots from jobs that crashed or timed out.
   */
  const cleanupStaleSnapshots = () => {
    const now = Date.now()
    let cleanedCount = 0

    for (const [jobId, entry] of jobSnapshots) {
      if (now - entry.timestamp > STALE_SNAPSHOT_TTL_MS) {
        jobSnapshots.delete(jobId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.warn({
        msg: `[Memory] Cleaned up ${cleanedCount} stale job snapshots`,
        event: 'memory_tracker_cleanup',
        metadata: {
          workerName,
          cleanedCount,
          remainingSnapshots: jobSnapshots.size,
        },
      })
    }
  }

  /**
   * Force cleanup if map is too large (prevents unbounded growth).
   */
  const enforceMaxSize = () => {
    if (jobSnapshots.size > MAX_SNAPSHOTS) {
      // Remove oldest half of entries
      const entries = Array.from(jobSnapshots.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      const toRemove = entries.slice(0, Math.floor(entries.length / 2))

      for (const [jobId] of toRemove) {
        jobSnapshots.delete(jobId)
      }

      logger.warn({
        msg: '[Memory] Forced cleanup - map exceeded max size',
        event: 'memory_tracker_force_cleanup',
        metadata: {
          workerName,
          removedCount: toRemove.length,
          remainingSnapshots: jobSnapshots.size,
        },
      })
    }
  }

  return {
    /**
     * Record memory before job starts.
     */
    beforeJob: (jobId: string | undefined) => {
      const snapshot = getMemorySnapshot()
      if (jobId) {
        jobSnapshots.set(jobId, { snapshot, timestamp: Date.now() })
      }
      jobCount++

      // Periodic cleanup every 100 jobs
      if (jobCount % 100 === 0) {
        cleanupStaleSnapshots()
        enforceMaxSize()
      }

      // Log every 10th job or on significant memory
      if (jobCount % 10 === 1 || snapshot.heapUsed > 256 * 1024 * 1024) {
        logMemorySnapshot('job_start', workerName, jobId, snapshot)
      }
    },

    /**
     * Record memory after job completes and log delta.
     */
    afterJob: (jobId: string | undefined) => {
      const afterSnapshot = getMemorySnapshot()
      const entry = jobId ? jobSnapshots.get(jobId) : undefined

      if (entry && jobId) {
        const delta = getMemoryDelta(entry.snapshot, afterSnapshot)
        totalHeapGrowth += delta.heapUsed

        // Log if heap grew more than 5MB or every 10 jobs
        if (delta.heapUsed > 5 * 1024 * 1024 || jobCount % 10 === 0) {
          logMemorySnapshot(
            'job_complete',
            workerName,
            jobId,
            afterSnapshot,
            delta,
          )
        }

        jobSnapshots.delete(jobId)
      }

      // Log cumulative stats every 50 jobs
      if (jobCount % 50 === 0) {
        logger.info({
          msg: `[Memory] Cumulative stats for ${workerName}`,
          event: 'memory_cumulative',
          metadata: {
            workerName,
            jobCount,
            totalHeapGrowth: formatBytes(totalHeapGrowth),
            avgHeapGrowthPerJob: formatBytes(totalHeapGrowth / jobCount),
            currentHeap: formatBytes(afterSnapshot.heapUsed),
            currentRss: formatBytes(afterSnapshot.rss),
            pendingSnapshots: jobSnapshots.size,
          },
        })
      }
    },

    /**
     * Get current tracking stats.
     */
    getStats: () => ({
      jobCount,
      totalHeapGrowth,
      avgHeapGrowthPerJob: jobCount > 0 ? totalHeapGrowth / jobCount : 0,
      pendingSnapshots: jobSnapshots.size,
    }),

    /**
     * Force cleanup of all stale snapshots.
     */
    cleanup: () => {
      cleanupStaleSnapshots()
    },
  }
}
