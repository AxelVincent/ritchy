import { z } from 'zod'
import type { EnrichmentStatusResponse } from './status'

/**
 * WebSocket error codes for enrichment namespace
 */
export type WebSocketErrorCode =
  | 'INVALID_UUID'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'RATE_LIMIT'

/**
 * Credit breakdown for contact enrichment
 * Sent with completed status updates
 */
export interface CreditsInfo {
  creditsUsed: number
  creditsBreakdown: {
    linkedin: number
    emails: number
    phones: number
  }
}

/**
 * Zod schemas for WebSocket event validation
 */
export const BatchSubscribeEventSchema = z.array(z.string().uuid())

export const WebSocketErrorSchema = z.object({
  message: z.string(),
  code: z.enum(['INVALID_UUID', 'NOT_FOUND', 'FORBIDDEN', 'RATE_LIMIT']),
  userPlaceId: z.string().uuid().optional(),
})

export const StatusUpdateEventSchema = z.object({
  userPlaceId: z.string().uuid(),
  status: z.enum(['idle', 'queued', 'processing', 'completed', 'failed']),
  step: z.string(),
  progress: z.number().min(0).max(100),
  updatedAt: z.number(),
  sequence: z.number(),
  error: z.string().optional(),
  jobId: z.string().optional(),
})

/**
 * Batch status update response - map of userPlaceId to status
 */
export type BatchStatusUpdate = Record<string, EnrichmentStatusResponse>

/**
 * Type-safe WebSocket event definitions for enrichment namespace
 */
export interface EnrichmentWebSocketServerEvents {
  // Company enrichment status update
  'company-status-update': (
    data: {
      userPlaceId: string
      sequence: number
    } & EnrichmentStatusResponse,
  ) => void

  // Batch status update sent after batch-subscribe
  'batch-status-update': (data: BatchStatusUpdate) => void

  // Contact enrichment status update
  'contact-status-update': (data: {
    contactId: string
    sequence: number
    status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
    progress: number
    step: string
    error?: string
    updatedAt: number
    /** Credit info - only present on completed status */
    credits?: CreditsInfo
  }) => void

  // Officer enrichment status update
  'officer-status-update': (data: {
    officerId: string
    sequence: number
    status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
    progress: number
    step: string
    error?: string
    updatedAt: number
  }) => void

  error: (error: {
    message: string
    code: WebSocketErrorCode
    userPlaceId?: string
    contactId?: string
  }) => void
}

export interface EnrichmentWebSocketClientEvents {
  // Replaces all current subscriptions with the new set
  'batch-subscribe': (userPlaceIds: string[]) => void
}

// Type exports for Zod schemas
export type WebSocketError = z.infer<typeof WebSocketErrorSchema>
export type StatusUpdateEvent = z.infer<typeof StatusUpdateEventSchema>
