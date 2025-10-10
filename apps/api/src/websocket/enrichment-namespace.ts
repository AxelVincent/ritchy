import { logger } from '@ritchy/logger'
import {
  type EnrichmentWebSocketClientEvents,
  type EnrichmentWebSocketServerEvents,
  SubscribeEventSchema,
  UnsubscribeEventSchema,
} from '@ritchy/types'
import type { Namespace, Server as SocketIOServer } from 'socket.io'
import { getEnrichmentStatus } from '../services/enrichment/status_manager'
import { verifyOwnership } from './ownership-cache'
import { authenticationMiddleware } from './server'

/**
 * Set up the enrichment namespace for real-time status updates
 * Handles subscription management and broadcasting enrichment progress
 *
 * Type-safe WebSocket events using @ritchy/types
 */
export const setupEnrichmentNamespace = (io: SocketIOServer) => {
  // Create /enrichment namespace with type-safe events
  const enrichmentNs: Namespace<
    EnrichmentWebSocketClientEvents,
    EnrichmentWebSocketServerEvents
  > = io.of('/enrichment')

  // Apply authentication middleware to enrichment namespace
  // This ensures socket.data.userId is populated before subscription events
  enrichmentNs.use(authenticationMiddleware)

  enrichmentNs.on('connection', (socket) => {
    logger.info({
      msg: 'Client connected to enrichment namespace',
      event: 'enrichment_websocket_connect',
      metadata: { socketId: socket.id, userId: socket.data.userId },
    })

    /**
     * Subscribe to enrichment status updates for a specific userPlaceId
     * Client will receive real-time updates via 'status-update' event
     */
    socket.on('subscribe', async (userPlaceId: unknown) => {
      try {
        // Validate UUID format
        const validatedId = SubscribeEventSchema.parse(userPlaceId)

        // Verify ownership using Redis-cached ownership check
        const isOwner = await verifyOwnership(validatedId, socket.data.userId)

        if (!isOwner) {
          logger.warn({
            msg: 'Unauthorized subscription attempt or userPlace not found',
            event: 'enrichment_websocket_subscribe_unauthorized',
            metadata: {
              socketId: socket.id,
              authenticatedUserId: socket.data.userId,
              userPlaceId: validatedId,
            },
          })

          socket.emit('error', {
            message:
              'Unauthorized: You do not own this enrichment or it does not exist',
            code: 'FORBIDDEN',
            userPlaceId: validatedId,
          })
          return
        }

        // Join room for this enrichment
        const room = `enrichment:${validatedId}`
        await socket.join(room)

        // Send current status immediately to the subscriber
        const status = await getEnrichmentStatus(validatedId)
        socket.emit('status-update', {
          userPlaceId: validatedId,
          ...status,
        })

        logger.debug({
          msg: 'Client subscribed to enrichment updates',
          event: 'enrichment_websocket_subscribe',
          metadata: {
            socketId: socket.id,
            userId: socket.data.userId,
            userPlaceId: validatedId,
            room,
          },
        })
      } catch (error) {
        logger.error({
          msg: 'Failed to subscribe to enrichment',
          event: 'enrichment_websocket_subscribe_error',
          metadata: {
            socketId: socket.id,
            userPlaceId,
            error: error instanceof Error ? error.message : String(error),
          },
        })

        socket.emit('error', {
          message: 'Invalid user place ID format',
          code: 'INVALID_UUID',
        })
      }
    })

    /**
     * Unsubscribe from enrichment status updates
     * Client will stop receiving updates for this enrichment
     */
    socket.on('unsubscribe', async (userPlaceId: unknown) => {
      try {
        // Validate UUID format
        const validatedId = UnsubscribeEventSchema.parse(userPlaceId)

        // Verify ownership (optional but good for audit trail)
        // Note: We allow unsubscribe even if not owner (graceful cleanup)
        const isOwner = await verifyOwnership(validatedId, socket.data.userId)

        if (!isOwner) {
          logger.debug({
            msg: 'Unsubscribe from unauthorized or non-existent userPlace (graceful cleanup)',
            event: 'enrichment_websocket_unsubscribe_not_owner',
            metadata: {
              socketId: socket.id,
              userId: socket.data.userId,
              userPlaceId: validatedId,
            },
          })
        }

        // Leave the room
        const room = `enrichment:${validatedId}`
        await socket.leave(room)

        logger.debug({
          msg: 'Client unsubscribed from enrichment updates',
          event: 'enrichment_websocket_unsubscribe',
          metadata: {
            socketId: socket.id,
            userId: socket.data.userId,
            userPlaceId: validatedId,
            room,
          },
        })
      } catch (error) {
        logger.error({
          msg: 'Failed to unsubscribe from enrichment',
          event: 'enrichment_websocket_unsubscribe_error',
          metadata: {
            socketId: socket.id,
            userPlaceId,
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    })

    /**
     * Handle disconnection - cleanup subscriptions
     */
    socket.on('disconnect', (reason) => {
      // Socket.IO automatically removes socket from all rooms on disconnect
      logger.info({
        msg: 'Client disconnected from enrichment namespace',
        event: 'enrichment_websocket_disconnect',
        metadata: {
          socketId: socket.id,
          userId: socket.data.userId,
          reason,
          roomCount: socket.rooms.size,
        },
      })
    })

    /**
     * Handle errors
     */
    socket.on('error', (error) => {
      logger.error({
        msg: 'WebSocket error in enrichment namespace',
        event: 'enrichment_websocket_error',
        metadata: {
          socketId: socket.id,
          userId: socket.data.userId,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    })
  })

  // Periodic cleanup of empty rooms (runs every 5 minutes)
  setInterval(
    () => {
      const rooms = enrichmentNs.adapter.rooms
      let cleanedCount = 0

      for (const [roomName, sockets] of rooms.entries()) {
        // Clean up enrichment rooms with no subscribers
        if (
          roomName.startsWith('enrichment:') &&
          (!sockets || sockets.size === 0)
        ) {
          rooms.delete(roomName)
          cleanedCount++
        }
      }

      if (cleanedCount > 0) {
        logger.info({
          msg: 'Cleaned up empty enrichment rooms',
          event: 'enrichment_websocket_room_cleanup',
          metadata: { cleanedCount },
        })
      }
    },
    5 * 60 * 1000,
  ) // 5 minutes

  logger.info({
    msg: 'Enrichment WebSocket namespace initialized',
    event: 'enrichment_websocket_namespace_initialized',
  })

  return enrichmentNs
}
