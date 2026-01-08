import { logger } from '@ritchy/logger'
import { redisClient } from './redis'

/**
 * Cross-process communication for enrichment status updates
 *
 * Uses Redis list (queue) for message passing.
 * Workers push status updates to a Redis list, API process polls and emits to WebSocket.
 *
 * Architecture:
 * Worker Process → Redis LPUSH (queue) → API Process (polling consumer) → WebSocket emit → Frontend
 */

// Channel names for different enrichment status types
export const PUBSUB_CHANNELS = {
  COMPANY_STATUS: 'enrichment:pubsub:company-status',
  OFFICER_STATUS: 'enrichment:pubsub:officer-status',
  CONTACT_STATUS: 'enrichment:pubsub:contact-status',
  AI_SEARCH_STATUS: 'ai-search:pubsub:status',
} as const

export type PubSubChannel =
  (typeof PUBSUB_CHANNELS)[keyof typeof PUBSUB_CHANNELS]

// Sequence counters per entity for message ordering
const sequenceCounters = new Map<string, number>()
// Track last access time for cleanup
const sequenceAccessTime = new Map<string, number>()

const getNextSequence = (entityId: string): number => {
  const current = sequenceCounters.get(entityId) ?? 0
  const next = current + 1
  sequenceCounters.set(entityId, next)
  sequenceAccessTime.set(entityId, Date.now())
  return next
}

// Message types for each channel
export interface CompanyStatusMessage {
  channel: typeof PUBSUB_CHANNELS.COMPANY_STATUS
  userPlaceId: string
  status: string
  step: string
  progress: number
  updatedAt: number
  sequence: number
  error?: string
}

export interface OfficerStatusMessage {
  channel: typeof PUBSUB_CHANNELS.OFFICER_STATUS
  officerId: string
  status: string
  step: string
  progress: number
  updatedAt: number
  sequence: number
  error?: string
}

export interface CreditsInfo {
  creditsUsed: number
  creditsBreakdown: {
    linkedin: number
    emails: number
    phones: number
  }
}

export interface ContactStatusMessage {
  channel: typeof PUBSUB_CHANNELS.CONTACT_STATUS
  contactId: string
  status: string
  step: string
  progress: number
  updatedAt: number
  sequence: number
  error?: string
  /** Credit info for contact enrichment (only present on completed status) */
  credits?: CreditsInfo
}

// AI Search status message types
export interface AISearchProgressMessage {
  channel: typeof PUBSUB_CHANNELS.AI_SEARCH_STATUS
  type: 'progress'
  searchId: string
  current: number
  total: number
  sequence: number
  updatedAt: number
}

export interface AISearchMatchMessage {
  channel: typeof PUBSUB_CHANNELS.AI_SEARCH_STATUS
  type: 'match'
  searchId: string
  place: Record<string, unknown>
  sequence: number
  updatedAt: number
}

export interface AISearchCompleteMessage {
  channel: typeof PUBSUB_CHANNELS.AI_SEARCH_STATUS
  type: 'complete'
  searchId: string
  summary: {
    totalEvaluated: number
    totalMatches: number
    creditsUsed: number
  }
  sequence: number
  updatedAt: number
}

export interface AISearchErrorMessage {
  channel: typeof PUBSUB_CHANNELS.AI_SEARCH_STATUS
  type: 'error'
  searchId: string
  error: string
  sequence: number
  updatedAt: number
}

export type AISearchMessage =
  | AISearchProgressMessage
  | AISearchMatchMessage
  | AISearchCompleteMessage
  | AISearchErrorMessage

export type PubSubMessage =
  | CompanyStatusMessage
  | OfficerStatusMessage
  | ContactStatusMessage
  | AISearchMessage

// Message types without sequence (for input)
export type CompanyStatusInput = Omit<CompanyStatusMessage, 'sequence'>
export type OfficerStatusInput = Omit<OfficerStatusMessage, 'sequence'>
export type ContactStatusInput = Omit<ContactStatusMessage, 'sequence'>

// AI Search input types - explicit to preserve discriminated union
export type AISearchProgressInput = Omit<AISearchProgressMessage, 'sequence'>
export type AISearchMatchInput = Omit<AISearchMatchMessage, 'sequence'>
export type AISearchCompleteInput = Omit<AISearchCompleteMessage, 'sequence'>
export type AISearchErrorInput = Omit<AISearchErrorMessage, 'sequence'>

export type AISearchMessageInput =
  | AISearchProgressInput
  | AISearchMatchInput
  | AISearchCompleteInput
  | AISearchErrorInput

export type PubSubMessageInput =
  | CompanyStatusInput
  | OfficerStatusInput
  | ContactStatusInput
  | AISearchMessageInput

// Redis list key for status updates queue
const STATUS_QUEUE_KEY = 'enrichment:status:queue'
const STATUS_QUEUE_TTL = 60 * 60 // 1 hour TTL for queue

/**
 * Get entity ID from a message for sequence tracking
 */
const getEntityIdFromMessage = (message: PubSubMessageInput): string => {
  if ('userPlaceId' in message) return message.userPlaceId
  if ('contactId' in message) return message.contactId
  if ('officerId' in message) return message.officerId
  if ('searchId' in message) return message.searchId
  throw new Error('Unable to determine entity ID from message')
}

/**
 * Publish a status update message with automatic sequence number
 * Called from worker processes - pushes to Redis list
 */
export const publishStatusUpdate = async (
  message: PubSubMessageInput,
): Promise<void> => {
  const entityId = getEntityIdFromMessage(message)

  const messageWithSeq = {
    ...message,
    sequence: getNextSequence(entityId),
  }

  try {
    await redisClient.redis.lpush(
      STATUS_QUEUE_KEY,
      JSON.stringify(messageWithSeq),
    )
    await redisClient.redis.expire(STATUS_QUEUE_KEY, STATUS_QUEUE_TTL)

    logger.debug({
      msg: 'Published status update to queue',
      event: 'status_queue_publish',
      metadata: { channel: message.channel, sequence: messageWithSeq.sequence },
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to publish status update',
      event: 'status_queue_publish_error',
      metadata: {
        channel: message.channel,
        error: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

/**
 * Reset sequence counter for an entity
 * Called when enrichment completes or fails
 */
export const resetSequence = (entityId: string): void => {
  sequenceCounters.delete(entityId)
  sequenceAccessTime.delete(entityId)
}

// =============================================================================
// Periodic Cleanup for Memory Management
// =============================================================================

const SEQUENCE_STALE_TTL_MS = 15 * 60 * 1000 // 15 minutes (reduced from 1 hour)
const SEQUENCE_CLEANUP_INTERVAL_MS = 2 * 60 * 1000 // 2 minutes (reduced from 5 minutes)
const MAX_SEQUENCE_ENTRIES = 10000 // Maximum entries before forced cleanup

let sequenceCleanupIntervalId: ReturnType<typeof setInterval> | null = null

/**
 * Force cleanup of oldest entries when maps exceed max size.
 * This prevents unbounded memory growth under high load.
 */
const enforceMaxSequenceMapSize = (): void => {
  if (sequenceCounters.size <= MAX_SEQUENCE_ENTRIES) return

  // Sort by access time and remove oldest half
  const entries = Array.from(sequenceAccessTime.entries())
  entries.sort((a, b) => a[1] - b[1])
  const toRemove = entries.slice(0, Math.floor(entries.length / 2))

  for (const [entityId] of toRemove) {
    sequenceCounters.delete(entityId)
    sequenceAccessTime.delete(entityId)
  }

  logger.warn({
    msg: 'Sequence counter forced cleanup - max size exceeded',
    event: 'sequence_counter_force_cleanup',
    metadata: {
      removedCount: toRemove.length,
      remainingSize: sequenceCounters.size,
      maxSize: MAX_SEQUENCE_ENTRIES,
    },
  })
}

/**
 * Clean up stale sequence counters from in-memory map.
 * Entries older than SEQUENCE_STALE_TTL_MS are removed.
 */
export const cleanupStaleSequences = (): void => {
  const now = Date.now()
  let cleanedCount = 0

  for (const [entityId, accessTime] of sequenceAccessTime) {
    if (now - accessTime > SEQUENCE_STALE_TTL_MS) {
      sequenceCounters.delete(entityId)
      sequenceAccessTime.delete(entityId)
      cleanedCount++
    }
  }

  // Also enforce max size
  enforceMaxSequenceMapSize()

  if (cleanedCount > 0) {
    logger.info({
      msg: `Cleaned ${cleanedCount} stale sequence counters`,
      event: 'sequence_counter_stale_cleanup',
      metadata: {
        cleanedCount,
        remainingCount: sequenceCounters.size,
      },
    })
  }
}

/**
 * Start the periodic sequence cleanup scheduler.
 * Should be called when the worker process starts.
 */
export const startSequenceCleanup = (): void => {
  if (sequenceCleanupIntervalId) return

  sequenceCleanupIntervalId = setInterval(
    cleanupStaleSequences,
    SEQUENCE_CLEANUP_INTERVAL_MS,
  )

  logger.info({
    msg: 'Sequence cleanup scheduler started',
    event: 'sequence_cleanup_started',
    metadata: {
      intervalMs: SEQUENCE_CLEANUP_INTERVAL_MS,
      staleTtlMs: SEQUENCE_STALE_TTL_MS,
    },
  })
}

/**
 * Stop the periodic sequence cleanup scheduler.
 * Should be called during graceful shutdown.
 */
export const stopSequenceCleanup = (): void => {
  if (sequenceCleanupIntervalId) {
    clearInterval(sequenceCleanupIntervalId)
    sequenceCleanupIntervalId = null

    logger.info({
      msg: 'Sequence cleanup scheduler stopped',
      event: 'sequence_cleanup_stopped',
    })
  }
}

/**
 * Get current sequence counter map size for monitoring.
 */
export const getSequenceCounterSize = (): number => sequenceCounters.size
