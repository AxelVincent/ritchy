import { logger } from '@ritchy/logger'
import {
  BatchSubscribeEventSchema,
  type EnrichmentWebSocketClientEvents,
  type EnrichmentWebSocketServerEvents,
} from '@ritchy/types'
import type { Namespace, Server as SocketIOServer } from 'socket.io'
import {
  websocketConnectionsGauge,
  websocketMessagesCounter,
} from '../metrics/collectors'
import { getBatchEnrichmentStatus } from '../services/enrichment/status_manager'
import { verifyOwnershipBatch } from './ownership-cache'
import { authenticationMiddleware } from './server'

/**
 * Set up the enrichment namespace for real-time status updates
 * Handles subscription management and broadcasting enrichment progress
 *
 * Simplified architecture (v2):
 * - Single batch-subscribe event replaces individual subscribe/unsubscribe
 * - Server leaves all previous rooms and joins new ones atomically
 * - Reduces WebSocket events from 2N to 1 per page change
 * - Eliminates race conditions from rapid subscribe/unsubscribe cycles
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
    // Increment connection gauge
    websocketConnectionsGauge.inc({ namespace: 'enrichment' })

    logger.info({
      msg: 'Client connected to enrichment namespace',
      event: 'enrichment_websocket_connect',
      metadata: { socketId: socket.id, userId: socket.data.userId },
    })

    /**
     * Batch subscribe to enrichment status updates
     * Replaces all current subscriptions with the new set
     * - Leaves all previous enrichment rooms
     * - Validates and verifies ownership in batch
     * - Joins new rooms
     * - Sends batch status update
     */
    socket.on('batch-subscribe', async (userPlaceIds: unknown) => {
      // Track inbound message
      websocketMessagesCounter.inc({
        namespace: 'enrichment',
        event_type: 'batch-subscribe',
        direction: 'inbound',
      })

      try {
        // Validate input array
        const validatedIds = BatchSubscribeEventSchema.parse(userPlaceIds)

        // Leave all current enrichment rooms
        const currentRooms = Array.from(socket.rooms)
        for (const room of currentRooms) {
          if (room.startsWith('enrichment:') && room !== socket.id) {
            await socket.leave(room)
          }
        }

        // Handle empty subscription (unsubscribe from all)
        if (validatedIds.length === 0) {
          logger.debug({
            msg: 'Client cleared all enrichment subscriptions',
            event: 'enrichment_websocket_batch_clear',
            metadata: { socketId: socket.id, userId: socket.data.userId },
          })

          // Send empty batch status
          socket.emit('batch-status-update', {})
          websocketMessagesCounter.inc({
            namespace: 'enrichment',
            event_type: 'batch-status-update',
            direction: 'outbound',
          })

          return
        }

        // Verify ownership in batch (single Redis MGET + potential DB query)
        const ownedIds = await verifyOwnershipBatch(
          validatedIds,
          socket.data.userId,
        )

        // Log unauthorized attempts (but don't fail the whole batch)
        const unauthorizedCount = validatedIds.length - ownedIds.length
        if (unauthorizedCount > 0) {
          logger.warn({
            msg: 'Some batch subscription IDs failed authorization',
            event: 'enrichment_websocket_batch_partial_auth',
            metadata: {
              socketId: socket.id,
              userId: socket.data.userId,
              requested: validatedIds.length,
              authorized: ownedIds.length,
              unauthorized: unauthorizedCount,
            },
          })
        }

        // Join rooms for all owned places
        for (const userPlaceId of ownedIds) {
          const room = `enrichment:${userPlaceId}`
          await socket.join(room)
        }

        // Get current status for all owned IDs in batch
        const statuses = await getBatchEnrichmentStatus(ownedIds)

        // Send batch status update
        socket.emit('batch-status-update', statuses)
        websocketMessagesCounter.inc({
          namespace: 'enrichment',
          event_type: 'batch-status-update',
          direction: 'outbound',
        })

        logger.debug({
          msg: 'Client batch subscribed to enrichment updates',
          event: 'enrichment_websocket_batch_subscribe',
          metadata: {
            socketId: socket.id,
            userId: socket.data.userId,
            subscribed: ownedIds.length,
            requested: validatedIds.length,
          },
        })
      } catch (error) {
        logger.error({
          msg: 'Failed to process batch subscription',
          event: 'enrichment_websocket_batch_subscribe_error',
          metadata: {
            socketId: socket.id,
            error: error instanceof Error ? error.message : String(error),
          },
        })

        socket.emit('error', {
          message: 'Invalid subscription format',
          code: 'INVALID_UUID',
        })

        websocketMessagesCounter.inc({
          namespace: 'enrichment',
          event_type: 'error',
          direction: 'outbound',
        })
      }
    })

    /**
     * Handle disconnection - cleanup subscriptions
     */
    socket.on('disconnect', (reason) => {
      // Decrement connection gauge
      websocketConnectionsGauge.dec({ namespace: 'enrichment' })

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

  logger.info({
    msg: 'Enrichment WebSocket namespace initialized (v2 - simplified)',
    event: 'enrichment_websocket_namespace_initialized',
  })

  return enrichmentNs
}
