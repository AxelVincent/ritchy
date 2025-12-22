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
} as const

export type PubSubChannel =
  (typeof PUBSUB_CHANNELS)[keyof typeof PUBSUB_CHANNELS]

// Sequence counters per entity for message ordering
const sequenceCounters = new Map<string, number>()

const getNextSequence = (entityId: string): number => {
  const current = sequenceCounters.get(entityId) ?? 0
  const next = current + 1
  sequenceCounters.set(entityId, next)
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

export type PubSubMessage =
  | CompanyStatusMessage
  | OfficerStatusMessage
  | ContactStatusMessage

// Message types without sequence (for input)
export type CompanyStatusInput = Omit<CompanyStatusMessage, 'sequence'>
export type OfficerStatusInput = Omit<OfficerStatusMessage, 'sequence'>
export type ContactStatusInput = Omit<ContactStatusMessage, 'sequence'>
export type PubSubMessageInput =
  | CompanyStatusInput
  | OfficerStatusInput
  | ContactStatusInput

// Redis list key for status updates queue
const STATUS_QUEUE_KEY = 'enrichment:status:queue'
const STATUS_QUEUE_TTL = 60 * 60 // 1 hour TTL for queue

/**
 * Publish a status update message with automatic sequence number
 * Called from worker processes - pushes to Redis list
 */
export const publishStatusUpdate = async (
  message: PubSubMessageInput,
): Promise<void> => {
  const entityId =
    'userPlaceId' in message
      ? message.userPlaceId
      : 'contactId' in message
        ? message.contactId
        : message.officerId

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
}
