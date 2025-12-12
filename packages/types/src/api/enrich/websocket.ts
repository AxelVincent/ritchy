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
  error: z.string().optional(),
  jobId: z.string().optional(),
})

/**
 * Batch status update response - map of userPlaceId to status
 */
export type BatchStatusUpdate = Record<string, EnrichmentStatusResponse>

/**
 * Type-safe WebSocket event definitions for enrichment namespace
 * Use with Socket.IO's typed event system
 *
 * Simplified architecture (v2):
 * - Single batch-subscribe event replaces individual subscribe/unsubscribe
 * - Server leaves all previous rooms and joins new ones in a single operation
 * - batch-status-update provides initial status for all subscribed IDs
 *
 * @example Backend
 * ```typescript
 * import type { EnrichmentWebSocketEvents } from '@ritchy/types'
 * const enrichmentNs: Namespace<EnrichmentWebSocketEvents> = io.of('/enrichment')
 * ```
 *
 * @example Frontend
 * ```typescript
 * import type { Socket } from 'socket.io-client'
 * import type { EnrichmentWebSocketEvents } from '@ritchy/types'
 * const socket: Socket<EnrichmentWebSocketServerEvents, EnrichmentWebSocketClientEvents> = io(...)
 * ```
 */
export interface EnrichmentWebSocketServerEvents {
  // Server → Client events
  'status-update': (
    data: {
      userPlaceId: string
    } & EnrichmentStatusResponse,
  ) => void

  // Batch status update sent after batch-subscribe
  'batch-status-update': (data: BatchStatusUpdate) => void

  error: (error: {
    message: string
    code: WebSocketErrorCode
    userPlaceId?: string
  }) => void
}

export interface EnrichmentWebSocketClientEvents {
  // Client → Server events
  // Replaces all current subscriptions with the new set
  'batch-subscribe': (userPlaceIds: string[]) => void
}

// Type exports for Zod schemas
export type WebSocketError = z.infer<typeof WebSocketErrorSchema>
export type StatusUpdateEvent = z.infer<typeof StatusUpdateEventSchema>
