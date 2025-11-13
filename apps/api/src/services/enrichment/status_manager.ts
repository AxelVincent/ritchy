import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { Namespace } from 'socket.io'
import { db } from '../../db/db'
import { userPlace as userPlaceTable } from '../../db/schema'
import { redisClient } from '../../internal/redis/redis'

export type EnrichmentProgressStatus =
  | 'idle'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'

export interface EnrichmentStatusData {
  status: EnrichmentProgressStatus
  step: string
  progress: number
  updatedAt: number
  error?: string
}

// Status TTL in Redis (30 minutes)
// Extended to 60 minutes for processing jobs to handle long-running scrapes
const STATUS_TTL = 30 * 60 // seconds
const STATUS_KEY_PREFIX = 'enrichment:status'

// Batch emission strategy for WebSocket updates
// - Non-terminal states (queued, processing): Batched within 100ms window to reduce event loop pressure
// - Terminal states (completed, failed): Emitted immediately to prevent race conditions in fast-completing jobs
// Rationale: 100ms allows ~10 updates/sec per enrichment without overwhelming clients
// while being short enough that users perceive updates as "instant" (<150ms threshold)
const BATCH_EMIT_DELAY = 100 // milliseconds

// Circuit breaker: Maximum batch size before forcing a flush
// Prevents unbounded memory growth if flush is delayed or fails
const MAX_BATCH_SIZE = 1000

// Global reference to enrichment namespace (set by server initialization)
let enrichmentNamespace: Namespace | null = null

// Batching state for bulk status updates
interface BatchedUpdate {
  userPlaceId: string
  statusData: EnrichmentStatusData
}

let pendingBatchUpdates: BatchedUpdate[] = []
let batchTimer: NodeJS.Timeout | null = null

export const setEnrichmentNamespace = (namespace: Namespace) => {
  enrichmentNamespace = namespace
  logger.info({
    msg: 'Enrichment namespace registered with status manager',
    event: 'enrichment_namespace_registered',
    metadata: { hasNamespace: !!enrichmentNamespace },
  })
}

/**
 * Flush batched updates to WebSocket clients
 * Emits all pending updates in a single flush for efficiency
 */
const flushBatchUpdates = () => {
  if (!enrichmentNamespace || pendingBatchUpdates.length === 0) return

  const batchCount = pendingBatchUpdates.length

  // Emit individual updates (Socket.IO doesn't support true batch events)
  // But batching them in a single flush reduces event loop pressure
  for (const update of pendingBatchUpdates) {
    const room = `enrichment:${update.userPlaceId}`

    enrichmentNamespace.to(room).emit('status-update', {
      userPlaceId: update.userPlaceId,
      ...update.statusData,
    })
  }

  logger.debug({
    msg: 'Batch emitted status updates',
    event: 'enrichment_batch_emit',
    metadata: { count: batchCount },
  })

  pendingBatchUpdates = []
  batchTimer = null
}

/**
 * Async version of flushBatchUpdates for cases where ordering matters
 * Returns a promise that resolves after the flush is complete
 */
const flushBatchUpdatesAsync = async (): Promise<void> => {
  return new Promise((resolve) => {
    // Clear any pending timer
    if (batchTimer) {
      clearTimeout(batchTimer)
    }

    // Flush immediately
    flushBatchUpdates()

    // Resolve after next tick to ensure all emits are processed
    setImmediate(() => resolve())
  })
}

/**
 * Queue a status update for batched emission
 * Updates are flushed after BATCH_EMIT_DELAY ms
 * Includes circuit breaker to prevent unbounded memory growth
 */
const queueBatchUpdate = (
  userPlaceId: string,
  statusData: EnrichmentStatusData,
) => {
  // Circuit breaker: Force flush if batch queue is full
  if (pendingBatchUpdates.length >= MAX_BATCH_SIZE) {
    logger.warn({
      msg: 'Batch update queue full, forcing immediate flush',
      event: 'enrichment_batch_overflow',
      metadata: {
        queueSize: pendingBatchUpdates.length,
        maxSize: MAX_BATCH_SIZE,
      },
    })

    // Clear pending timer and flush immediately
    if (batchTimer) {
      clearTimeout(batchTimer)
      batchTimer = null
    }
    flushBatchUpdates()
  }

  // Add to pending updates (replace if already exists for same ID)
  const existingIndex = pendingBatchUpdates.findIndex(
    (u) => u.userPlaceId === userPlaceId,
  )
  if (existingIndex >= 0) {
    pendingBatchUpdates[existingIndex] = { userPlaceId, statusData }
  } else {
    pendingBatchUpdates.push({ userPlaceId, statusData })
  }

  // Schedule flush if not already scheduled
  if (!batchTimer) {
    batchTimer = setTimeout(flushBatchUpdates, BATCH_EMIT_DELAY)
  }
}

/**
 * Set enrichment status in Redis with automatic expiration
 * Also publishes updates to WebSocket subscribers via both Socket.IO and Redis pub/sub
 */
export const setEnrichmentStatus = async (
  userPlaceId: string,
  status: EnrichmentProgressStatus,
  step: string,
  progress: number,
  error?: string,
): Promise<void> => {
  const key = `${STATUS_KEY_PREFIX}:${userPlaceId}`

  try {
    const statusData: EnrichmentStatusData = {
      status,
      step,
      progress,
      updatedAt: Date.now(),
      ...(error && { error }),
    }

    // Extend TTL for processing jobs to prevent expiration during long-running operations
    const ttl = status === 'processing' ? 60 * 60 : STATUS_TTL // 60 minutes for processing

    // Store in Redis with TTL
    await redisClient.redis.setex(key, ttl, JSON.stringify(statusData))

    // Emit terminal states immediately to prevent race conditions
    // For fast-completing jobs, batching can drop intermediate states
    if (enrichmentNamespace) {
      if (status === 'completed' || status === 'failed') {
        // Flush any pending batched updates first to maintain correct order
        // Use async flush to ensure batched updates are sent BEFORE terminal state
        await flushBatchUpdatesAsync()

        const room = `enrichment:${userPlaceId}`

        // Emit terminal state immediately
        enrichmentNamespace.to(room).emit('status-update', {
          userPlaceId,
          ...statusData,
        })

        logger.debug({
          msg: 'Emitted terminal status immediately',
          event: 'enrichment_terminal_status_emit',
          metadata: {
            userPlaceId,
            status,
            room,
          },
        })
      } else {
        // Queue non-terminal states for batched emission
        queueBatchUpdate(userPlaceId, statusData)

        logger.debug({
          msg: 'Queued status update for batching',
          event: 'enrichment_status_queued',
          metadata: {
            userPlaceId,
            status,
            step,
            progress,
            pendingCount: pendingBatchUpdates.length,
          },
        })
      }
    } else {
      logger.warn({
        msg: 'Enrichment namespace not available - status update not emitted',
        event: 'enrichment_namespace_missing',
        metadata: { userPlaceId, status },
      })
    }

    logger.debug({
      msg:
        status === 'completed' || status === 'failed'
          ? 'Enrichment terminal status updated and emitted immediately'
          : 'Enrichment status updated and queued for batch emit',
      event: 'enrichment_status_updated',
      metadata: {
        userPlaceId,
        status,
        step,
        progress,
        hasWebSocket: !!enrichmentNamespace,
        emissionMode:
          status === 'completed' || status === 'failed'
            ? 'immediate'
            : 'batched',
      },
    })

    // If final state, persist to PostgreSQL
    if (status === 'completed' || status === 'failed') {
      await db
        .update(userPlaceTable)
        .set({
          enriched_at: status === 'completed' ? new Date() : null,
          updated_at: new Date(),
        })
        .where(eq(userPlaceTable.id, userPlaceId))

      logger.info({
        msg: 'Enrichment final status persisted to database',
        event: 'enrichment_status_persisted',
        metadata: { userPlaceId, status },
      })
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to set enrichment status',
      event: 'set_enrichment_status_error',
      metadata: {
        userPlaceId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

/**
 * Get enrichment status from Redis
 * Note: Returns 'idle' if not found in Redis. Completed enrichments are tracked
 * via userPlace.enriched_at in the database, which is returned by getAggregatedUserPlaces.
 */
export const getEnrichmentStatus = async (
  userPlaceId: string,
): Promise<EnrichmentStatusData> => {
  const key = `${STATUS_KEY_PREFIX}:${userPlaceId}`

  try {
    const data = await redisClient.redis.get(key)

    if (data) {
      return JSON.parse(data) as EnrichmentStatusData
    }

    // Default: idle (no Redis data means not actively enriching)
    return {
      status: 'idle',
      step: '',
      progress: 0,
      updatedAt: Date.now(),
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to get enrichment status',
      event: 'get_enrichment_status_error',
      metadata: {
        userPlaceId,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return {
      status: 'idle',
      step: '',
      progress: 0,
      updatedAt: Date.now(),
    }
  }
}

/**
 * Get status for multiple enrichments in a single call (optimized)
 * Uses Redis MGET for efficient batch retrieval of active enrichment statuses
 * Note: Returns 'idle' for enrichments not found in Redis. Completed enrichments are tracked
 * via userPlace.enriched_at in the database, which is returned by getAggregatedUserPlaces.
 */
export const getBatchEnrichmentStatus = async (
  userPlaceIds: string[],
): Promise<Record<string, EnrichmentStatusData>> => {
  const result: Record<string, EnrichmentStatusData> = {}

  try {
    // Use Redis MGET for better performance than pipeline
    const keys = userPlaceIds.map((id) => `${STATUS_KEY_PREFIX}:${id}`)
    const values = await redisClient.redis.mget(...keys)

    // Process results
    for (let i = 0; i < userPlaceIds.length; i++) {
      const userPlaceId = userPlaceIds[i]
      const value = values[i]

      if (value) {
        result[userPlaceId] = JSON.parse(value) as EnrichmentStatusData
      } else {
        // No Redis data = idle (not actively enriching)
        result[userPlaceId] = {
          status: 'idle',
          step: '',
          progress: 0,
          updatedAt: Date.now(),
        }
      }
    }

    return result
  } catch (error) {
    logger.error({
      msg: 'Failed to get batch enrichment status',
      event: 'get_batch_enrichment_status_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    // Return idle status for all on error
    for (const userPlaceId of userPlaceIds) {
      result[userPlaceId] = {
        status: 'idle',
        step: '',
        progress: 0,
        updatedAt: Date.now(),
      }
    }

    return result
  }
}

/**
 * Clear enrichment status from Redis
 */
export const clearEnrichmentStatus = async (
  userPlaceId: string,
): Promise<void> => {
  const key = `${STATUS_KEY_PREFIX}:${userPlaceId}`
  await redisClient.redis.del(key)
}

/**
 * Force flush any pending batch updates
 * Should be called during graceful shutdown
 */
export const flushPendingUpdates = (): void => {
  if (batchTimer) {
    clearTimeout(batchTimer)
  }
  flushBatchUpdates()
}
