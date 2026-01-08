import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { Namespace } from 'socket.io'
import { db } from '../../../../db/db'
import { userPlace as userPlaceTable } from '../../../../db/schema'
import {
  PUBSUB_CHANNELS,
  type PubSubMessage,
  publishStatusUpdate,
  resetSequence,
} from '../../../../internal/redis/pubsub'
import { redisClient } from '../../../../internal/redis/redis'
import { websocketMessagesCounter } from '../../../../metrics/collectors'

export type EnrichmentProgressStatus =
  | 'idle'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'

export interface CreditsInfo {
  creditsUsed: number
  creditsBreakdown: {
    linkedin: number
    emails: number
    phones: number
  }
}

export interface EnrichmentStatusData {
  status: EnrichmentProgressStatus
  step: string
  progress: number
  updatedAt: number
  error?: string
  /** Credit info for contact enrichment (only present on completed status) */
  credits?: CreditsInfo
}

// Status TTL in Redis (30 minutes, 60 minutes for processing)
const STATUS_TTL = 30 * 60
const COMPANY_STATUS_KEY_PREFIX = 'enrichment:company:status'
const OFFICER_STATUS_KEY_PREFIX = 'enrichment:officer:status'
const CONTACT_STATUS_KEY_PREFIX = 'enrichment:contact:status'

// Throttling configuration
const UPDATE_THROTTLE_MS = 500 // Max 2 updates per second per entity
const lastUpdateTimeMap = new Map<string, number>()
const pendingUpdatesMap = new Map<string, EnrichmentStatusData>()
const pendingTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

// Progress tracking to prevent backward jumps
const lastProgressMap = new Map<string, number>()

// Global reference to enrichment namespace
let enrichmentNamespace: Namespace | null = null

export const setEnrichmentNamespace = (namespace: Namespace) => {
  enrichmentNamespace = namespace
  logger.info({
    msg: 'Enrichment namespace registered with status manager',
    event: 'enrichment_namespace_registered',
  })
}

/**
 * Emit a status update to WebSocket clients
 * Called by the polling consumer when receiving messages from workers
 */
export const emitStatusUpdateToWebSocket = (message: PubSubMessage): void => {
  if (!enrichmentNamespace) {
    logger.warn({
      msg: 'Cannot emit to WebSocket - namespace not available',
      event: 'websocket_emit_no_namespace',
      metadata: { channel: message.channel },
    })
    return
  }

  switch (message.channel) {
    case PUBSUB_CHANNELS.COMPANY_STATUS: {
      const room = `enrichment:company:${message.userPlaceId}`
      enrichmentNamespace.to(room).emit('company-status-update', {
        userPlaceId: message.userPlaceId,
        status: message.status as EnrichmentProgressStatus,
        step: message.step,
        progress: message.progress,
        updatedAt: message.updatedAt,
        sequence: message.sequence,
        ...(message.error && { error: message.error }),
      })
      websocketMessagesCounter.inc({
        namespace: 'enrichment',
        event_type: 'company-status-update',
        direction: 'outbound',
      })
      break
    }
    case PUBSUB_CHANNELS.OFFICER_STATUS: {
      const room = `enrichment:officer:${message.officerId}`
      enrichmentNamespace.to(room).emit('officer-status-update', {
        officerId: message.officerId,
        status: message.status as EnrichmentProgressStatus,
        step: message.step,
        progress: message.progress,
        updatedAt: message.updatedAt,
        sequence: message.sequence,
        ...(message.error && { error: message.error }),
      })
      websocketMessagesCounter.inc({
        namespace: 'enrichment',
        event_type: 'officer-status-update',
        direction: 'outbound',
      })
      break
    }
    case PUBSUB_CHANNELS.CONTACT_STATUS: {
      const room = `enrichment:contact:${message.contactId}`
      enrichmentNamespace.to(room).emit('contact-status-update', {
        contactId: message.contactId,
        status: message.status as EnrichmentProgressStatus,
        step: message.step,
        progress: message.progress,
        updatedAt: message.updatedAt,
        sequence: message.sequence,
        ...(message.error && { error: message.error }),
        ...(message.credits && { credits: message.credits }),
      })
      websocketMessagesCounter.inc({
        namespace: 'enrichment',
        event_type: 'contact-status-update',
        direction: 'outbound',
      })
      break
    }
  }

  logger.debug({
    msg: 'Emitted status update to WebSocket',
    event: 'websocket_status_emitted',
    metadata: { channel: message.channel },
  })
}

/**
 * Clear pending update for an entity
 */
const clearPendingUpdate = (entityId: string): void => {
  pendingUpdatesMap.delete(entityId)
  const timeout = pendingTimeouts.get(entityId)
  if (timeout) {
    clearTimeout(timeout)
    pendingTimeouts.delete(entityId)
  }
  lastUpdateTimeMap.delete(entityId)
  lastProgressMap.delete(entityId)
  resetSequence(entityId)
}

/**
 * Emit status update immediately (bypasses throttling)
 */
const emitStatusUpdateNow = async (
  userPlaceId: string,
  statusData: EnrichmentStatusData,
): Promise<void> => {
  lastUpdateTimeMap.set(userPlaceId, Date.now())

  await publishStatusUpdate({
    channel: PUBSUB_CHANNELS.COMPANY_STATUS,
    userPlaceId,
    status: statusData.status,
    step: statusData.step,
    progress: statusData.progress,
    updatedAt: statusData.updatedAt,
    ...(statusData.error && { error: statusData.error }),
  })

  logger.debug({
    msg: 'Company enrichment status updated and published',
    event: 'company_enrichment_status_updated',
    metadata: {
      userPlaceId,
      status: statusData.status,
      step: statusData.step,
      progress: statusData.progress,
    },
  })
}

// =============================================================================
// Company Enrichment Status Functions
// =============================================================================

/**
 * Set company enrichment status in Redis with throttling and progress smoothing
 */
export const setCompanyEnrichmentStatus = async (
  userPlaceId: string,
  status: EnrichmentProgressStatus,
  step: string,
  progress: number,
  error?: string,
): Promise<void> => {
  const key = `${COMPANY_STATUS_KEY_PREFIX}:${userPlaceId}`
  const now = Date.now()

  // Ensure progress never goes backward (except on reset to 0)
  const lastProgress = lastProgressMap.get(userPlaceId) ?? 0
  const smoothedProgress = progress === 0 ? 0 : Math.max(progress, lastProgress)
  lastProgressMap.set(userPlaceId, smoothedProgress)

  const statusData: EnrichmentStatusData = {
    status,
    step,
    progress: smoothedProgress,
    updatedAt: now,
    ...(error && { error }),
  }

  try {
    // Always update Redis (source of truth)
    const ttl = status === 'processing' ? 60 * 60 : STATUS_TTL
    await redisClient.redis.setex(key, ttl, JSON.stringify(statusData))

    // Terminal states always emit immediately and clean up
    if (status === 'completed' || status === 'failed' || status === 'queued') {
      await emitStatusUpdateNow(userPlaceId, statusData)
      clearPendingUpdate(userPlaceId)

      // Persist to DB on terminal states
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
      return
    }

    // Throttle processing updates
    const lastUpdate = lastUpdateTimeMap.get(userPlaceId) ?? 0
    const timeSinceLastUpdate = now - lastUpdate

    if (timeSinceLastUpdate >= UPDATE_THROTTLE_MS) {
      await emitStatusUpdateNow(userPlaceId, statusData)
    } else {
      // Store pending update
      pendingUpdatesMap.set(userPlaceId, statusData)

      // Schedule emission if not already scheduled
      if (!pendingTimeouts.has(userPlaceId)) {
        const timeout = setTimeout(async () => {
          const pending = pendingUpdatesMap.get(userPlaceId)
          if (pending) {
            pendingUpdatesMap.delete(userPlaceId)
            pendingTimeouts.delete(userPlaceId)
            await emitStatusUpdateNow(userPlaceId, pending)
          }
        }, UPDATE_THROTTLE_MS - timeSinceLastUpdate)

        pendingTimeouts.set(userPlaceId, timeout)
      }
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to set company enrichment status',
      event: 'set_company_enrichment_status_error',
      metadata: {
        userPlaceId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

/**
 * Get company enrichment status from Redis
 */
export const getCompanyEnrichmentStatus = async (
  userPlaceId: string,
): Promise<EnrichmentStatusData> => {
  const key = `${COMPANY_STATUS_KEY_PREFIX}:${userPlaceId}`

  try {
    const data = await redisClient.redis.get(key)
    if (data) {
      return JSON.parse(data) as EnrichmentStatusData
    }
    return {
      status: 'idle',
      step: '',
      progress: 0,
      updatedAt: Date.now(),
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to get company enrichment status',
      event: 'get_company_enrichment_status_error',
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
 */
export const getBatchEnrichmentStatus = async (
  userPlaceIds: string[],
): Promise<Record<string, EnrichmentStatusData>> => {
  const result: Record<string, EnrichmentStatusData> = {}

  try {
    const keys = userPlaceIds.map((id) => `${COMPANY_STATUS_KEY_PREFIX}:${id}`)
    const values = await redisClient.redis.mget(...keys)

    for (let i = 0; i < userPlaceIds.length; i++) {
      const userPlaceId = userPlaceIds[i]
      const value = values[i]

      if (value) {
        result[userPlaceId] = JSON.parse(value) as EnrichmentStatusData
      } else {
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
 * Set company enrichment status for multiple entities in a single Redis pipeline.
 * Used for bulk operations to avoid N+1 Redis calls.
 *
 * @param updates - Array of status updates to set
 */
export const setBatchCompanyEnrichmentStatus = async (
  updates: Array<{
    userPlaceId: string
    status: EnrichmentProgressStatus
    step: string
    progress: number
  }>,
): Promise<void> => {
  if (updates.length === 0) return

  const now = Date.now()

  try {
    // Use Redis pipeline for atomic batch operation
    const pipeline = redisClient.redis.pipeline()

    for (const { userPlaceId, status, step, progress } of updates) {
      const key = `${COMPANY_STATUS_KEY_PREFIX}:${userPlaceId}`
      const statusData: EnrichmentStatusData = {
        status,
        step,
        progress,
        updatedAt: now,
      }
      pipeline.setex(key, STATUS_TTL, JSON.stringify(statusData))
    }

    await pipeline.exec()

    // Publish status updates for WebSocket notifications
    await Promise.all(
      updates.map(({ userPlaceId, status, step, progress }) =>
        publishStatusUpdate({
          channel: PUBSUB_CHANNELS.COMPANY_STATUS,
          userPlaceId,
          status,
          step,
          progress,
          updatedAt: now,
        }),
      ),
    )

    logger.debug({
      msg: 'Batch company enrichment status updated',
      event: 'batch_company_enrichment_status_updated',
      metadata: { count: updates.length },
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to set batch company enrichment status',
      event: 'set_batch_company_enrichment_status_error',
      metadata: {
        count: updates.length,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}

/**
 * Clear enrichment status from Redis
 */
export const clearEnrichmentStatus = async (
  userPlaceId: string,
): Promise<void> => {
  const key = `${COMPANY_STATUS_KEY_PREFIX}:${userPlaceId}`
  await redisClient.redis.del(key)
  clearPendingUpdate(userPlaceId)
}

// =============================================================================
// Officer Enrichment Status Functions
// =============================================================================

/**
 * Set officer enrichment status in Redis
 */
export const setOfficerEnrichmentStatus = async (
  officerId: string,
  status: EnrichmentProgressStatus,
  step: string,
  progress: number,
  error?: string,
): Promise<void> => {
  const key = `${OFFICER_STATUS_KEY_PREFIX}:${officerId}`

  try {
    const statusData: EnrichmentStatusData = {
      status,
      step,
      progress,
      updatedAt: Date.now(),
      ...(error && { error }),
    }

    const ttl = status === 'processing' ? 60 * 60 : STATUS_TTL
    await redisClient.redis.setex(key, ttl, JSON.stringify(statusData))

    await publishStatusUpdate({
      channel: PUBSUB_CHANNELS.OFFICER_STATUS,
      officerId,
      status,
      step,
      progress,
      updatedAt: statusData.updatedAt,
      ...(error && { error }),
    })

    logger.debug({
      msg: 'Officer enrichment status updated and published',
      event: 'officer_enrichment_status_updated',
      metadata: { officerId, status, step, progress },
    })

    if (status === 'completed' || status === 'failed') {
      clearPendingUpdate(officerId)
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to set officer enrichment status',
      event: 'set_officer_enrichment_status_error',
      metadata: {
        officerId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

/**
 * Get officer enrichment status from Redis
 */
export const getOfficerEnrichmentStatus = async (
  officerId: string,
): Promise<EnrichmentStatusData> => {
  const key = `${OFFICER_STATUS_KEY_PREFIX}:${officerId}`

  try {
    const data = await redisClient.redis.get(key)
    if (data) {
      return JSON.parse(data) as EnrichmentStatusData
    }
    return {
      status: 'idle',
      step: '',
      progress: 0,
      updatedAt: Date.now(),
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to get officer enrichment status',
      event: 'get_officer_enrichment_status_error',
      metadata: {
        officerId,
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
 * Get status for multiple officers in a single call
 */
export const getBatchOfficerEnrichmentStatus = async (
  officerIds: string[],
): Promise<Record<string, EnrichmentStatusData>> => {
  const result: Record<string, EnrichmentStatusData> = {}

  try {
    const keys = officerIds.map((id) => `${OFFICER_STATUS_KEY_PREFIX}:${id}`)
    const values = await redisClient.redis.mget(...keys)

    for (let i = 0; i < officerIds.length; i++) {
      const officerId = officerIds[i]
      const value = values[i]

      if (value) {
        result[officerId] = JSON.parse(value) as EnrichmentStatusData
      } else {
        result[officerId] = {
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
      msg: 'Failed to get batch officer enrichment status',
      event: 'get_batch_officer_enrichment_status_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    for (const officerId of officerIds) {
      result[officerId] = {
        status: 'idle',
        step: '',
        progress: 0,
        updatedAt: Date.now(),
      }
    }

    return result
  }
}

// =============================================================================
// Contact Enrichment Status Functions
// =============================================================================

/**
 * Set contact enrichment status in Redis
 */
export const setContactEnrichmentStatus = async (
  contactId: string,
  status: EnrichmentProgressStatus,
  step: string,
  progress: number,
  error?: string,
  credits?: CreditsInfo,
): Promise<void> => {
  const key = `${CONTACT_STATUS_KEY_PREFIX}:${contactId}`

  try {
    const statusData: EnrichmentStatusData = {
      status,
      step,
      progress,
      updatedAt: Date.now(),
      ...(error && { error }),
      ...(credits && { credits }),
    }

    const ttl = status === 'processing' ? 60 * 60 : STATUS_TTL
    await redisClient.redis.setex(key, ttl, JSON.stringify(statusData))

    await publishStatusUpdate({
      channel: PUBSUB_CHANNELS.CONTACT_STATUS,
      contactId,
      status,
      step,
      progress,
      updatedAt: statusData.updatedAt,
      ...(error && { error }),
      ...(credits && { credits }),
    })

    logger.debug({
      msg: 'Contact enrichment status updated and published',
      event: 'contact_enrichment_status_updated',
      metadata: { contactId, status, step, progress, credits },
    })

    if (status === 'completed' || status === 'failed') {
      clearPendingUpdate(contactId)
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to set contact enrichment status',
      event: 'set_contact_enrichment_status_error',
      metadata: {
        contactId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

/**
 * Get contact enrichment status from Redis
 */
export const getContactEnrichmentStatus = async (
  contactId: string,
): Promise<EnrichmentStatusData> => {
  const key = `${CONTACT_STATUS_KEY_PREFIX}:${contactId}`

  try {
    const data = await redisClient.redis.get(key)
    if (data) {
      return JSON.parse(data) as EnrichmentStatusData
    }
    return {
      status: 'idle',
      step: '',
      progress: 0,
      updatedAt: Date.now(),
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to get contact enrichment status',
      event: 'get_contact_enrichment_status_error',
      metadata: {
        contactId,
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
 * Get status for multiple contacts in a single call
 */
export const getBatchContactEnrichmentStatus = async (
  contactIds: string[],
): Promise<Record<string, EnrichmentStatusData>> => {
  const result: Record<string, EnrichmentStatusData> = {}

  try {
    const keys = contactIds.map((id) => `${CONTACT_STATUS_KEY_PREFIX}:${id}`)
    const values = await redisClient.redis.mget(...keys)

    for (let i = 0; i < contactIds.length; i++) {
      const contactId = contactIds[i]
      const value = values[i]

      if (value) {
        result[contactId] = JSON.parse(value) as EnrichmentStatusData
      } else {
        result[contactId] = {
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
      msg: 'Failed to get batch contact enrichment status',
      event: 'get_batch_contact_enrichment_status_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    for (const contactId of contactIds) {
      result[contactId] = {
        status: 'idle',
        step: '',
        progress: 0,
        updatedAt: Date.now(),
      }
    }

    return result
  }
}

// =============================================================================
// Legacy aliases for backward compatibility
// =============================================================================

/**
 * @deprecated Use setCompanyEnrichmentStatus instead
 */
export const setEnrichmentStatus = setCompanyEnrichmentStatus

/**
 * @deprecated Use getCompanyEnrichmentStatus instead
 */
export const getEnrichmentStatus = getCompanyEnrichmentStatus

// =============================================================================
// Periodic Cleanup for Memory Management
// =============================================================================

const STALE_ENTRY_TTL_MS = 5 * 60 * 1000 // 5 minutes (reduced from 15 minutes)
const CLEANUP_INTERVAL_MS = 60 * 1000 // 1 minute (reduced from 2 minutes)
const MAX_MAP_SIZE = 2000 // Maximum entries before forced cleanup (reduced from 5000)

let cleanupIntervalId: ReturnType<typeof setInterval> | null = null

/**
 * Force cleanup of oldest entries when maps exceed max size.
 * This prevents unbounded memory growth under high load.
 */
const enforceMaxMapSize = (): void => {
  if (lastUpdateTimeMap.size <= MAX_MAP_SIZE) return

  // Sort by timestamp and remove oldest half
  const entries = Array.from(lastUpdateTimeMap.entries())
  entries.sort((a, b) => a[1] - b[1])
  const toRemove = entries.slice(0, Math.floor(entries.length / 2))

  for (const [entityId] of toRemove) {
    clearPendingUpdate(entityId)
  }

  logger.warn({
    msg: 'Status manager forced cleanup - max size exceeded',
    event: 'status_manager_force_cleanup',
    metadata: {
      removedCount: toRemove.length,
      remainingSize: lastUpdateTimeMap.size,
      maxSize: MAX_MAP_SIZE,
    },
  })
}

/**
 * Clean up stale entries from in-memory maps.
 * Entries older than STALE_ENTRY_TTL_MS are removed.
 * This is a safety net for entries that weren't cleaned up on terminal states.
 */
export const cleanupStaleStatusEntries = (): void => {
  const now = Date.now()
  let cleanedCount = 0

  for (const [entityId, lastUpdate] of lastUpdateTimeMap) {
    if (now - lastUpdate > STALE_ENTRY_TTL_MS) {
      clearPendingUpdate(entityId)
      cleanedCount++
    }
  }

  // Also enforce max size
  enforceMaxMapSize()

  if (cleanedCount > 0) {
    logger.info({
      msg: `Cleaned ${cleanedCount} stale status manager entries`,
      event: 'status_manager_stale_cleanup',
      metadata: {
        cleanedCount,
        mapSizes: {
          lastUpdateTimeMap: lastUpdateTimeMap.size,
          pendingUpdatesMap: pendingUpdatesMap.size,
          pendingTimeouts: pendingTimeouts.size,
          lastProgressMap: lastProgressMap.size,
        },
      },
    })
  }
}

/**
 * Start the periodic cleanup scheduler.
 * Should be called when the worker process starts.
 */
export const startStatusManagerCleanup = (): void => {
  if (cleanupIntervalId) return

  cleanupIntervalId = setInterval(
    cleanupStaleStatusEntries,
    CLEANUP_INTERVAL_MS,
  )

  logger.info({
    msg: 'Status manager cleanup scheduler started',
    event: 'status_manager_cleanup_started',
    metadata: {
      intervalMs: CLEANUP_INTERVAL_MS,
      staleTtlMs: STALE_ENTRY_TTL_MS,
    },
  })
}

/**
 * Stop the periodic cleanup scheduler.
 * Should be called during graceful shutdown.
 */
export const stopStatusManagerCleanup = (): void => {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId)
    cleanupIntervalId = null

    logger.info({
      msg: 'Status manager cleanup scheduler stopped',
      event: 'status_manager_cleanup_stopped',
    })
  }
}

/**
 * Get current map sizes for monitoring/debugging.
 */
export const getStatusManagerMapSizes = (): {
  lastUpdateTimeMap: number
  pendingUpdatesMap: number
  pendingTimeouts: number
  lastProgressMap: number
} => ({
  lastUpdateTimeMap: lastUpdateTimeMap.size,
  pendingUpdatesMap: pendingUpdatesMap.size,
  pendingTimeouts: pendingTimeouts.size,
  lastProgressMap: lastProgressMap.size,
})
