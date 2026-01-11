import { logger } from '@ritchy/logger'
import type { Namespace, Server as SocketIOServer } from 'socket.io'
import {
  websocketConnectionsGauge,
  websocketMessagesCounter,
} from '../metrics/collectors'
import { getBatchEnrichmentStatus } from '../services/enrichment/shared/status/status_manager'
import {
  BatchSubscribeEventSchema,
  type EnrichmentWebSocketClientEvents,
  type EnrichmentWebSocketServerEvents,
} from '../shared'
import { verifyOwnershipBatch } from './ownership-cache'
import { authenticationMiddleware } from './server'

/**
 * Set up the enrichment namespace for real-time status updates
 * Handles subscription management and broadcasting enrichment progress
 */
export const setupEnrichmentNamespace = (io: SocketIOServer) => {
  const enrichmentNs: Namespace<
    EnrichmentWebSocketClientEvents,
    EnrichmentWebSocketServerEvents
  > = io.of('/enrichment')

  enrichmentNs.use(authenticationMiddleware)

  enrichmentNs.on('connection', (socket) => {
    websocketConnectionsGauge.inc({ namespace: 'enrichment' })

    logger.info({
      msg: 'Client connected to enrichment namespace',
      event: 'enrichment_websocket_connect',
      metadata: { socketId: socket.id, userId: socket.data.userId },
    })

    /**
     * Batch subscribe to enrichment status updates
     * Replaces all current subscriptions with the new set
     */
    socket.on('batch-subscribe', async (userPlaceIds: unknown) => {
      websocketMessagesCounter.inc({
        namespace: 'enrichment',
        event_type: 'batch-subscribe',
        direction: 'inbound',
      })

      try {
        const validatedIds = BatchSubscribeEventSchema.parse(userPlaceIds)

        // Leave all current enrichment rooms IN PARALLEL
        const currentRooms = Array.from(socket.rooms)
        await Promise.all(
          currentRooms
            .filter(
              (room) => room.startsWith('enrichment:') && room !== socket.id,
            )
            .map((room) => socket.leave(room)),
        )

        // Handle empty subscription (unsubscribe from all)
        if (validatedIds.length === 0) {
          logger.debug({
            msg: 'Client cleared all enrichment subscriptions',
            event: 'enrichment_websocket_batch_clear',
            metadata: { socketId: socket.id, userId: socket.data.userId },
          })

          socket.emit('batch-status-update', {})
          websocketMessagesCounter.inc({
            namespace: 'enrichment',
            event_type: 'batch-status-update',
            direction: 'outbound',
          })
          return
        }

        // Verify ownership in batch
        const ownedIds = await verifyOwnershipBatch(
          validatedIds,
          socket.data.userId,
        )

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

        // Join all rooms IN PARALLEL
        await Promise.all(
          ownedIds.flatMap((userPlaceId) => [
            socket.join(`enrichment:${userPlaceId}`),
            socket.join(`enrichment:company:${userPlaceId}`),
          ]),
        )

        // Get current status for all owned IDs in batch
        const statuses = await getBatchEnrichmentStatus(ownedIds)

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

    socket.on('disconnect', (reason) => {
      websocketConnectionsGauge.dec({ namespace: 'enrichment' })

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
    msg: 'Enrichment WebSocket namespace initialized',
    event: 'enrichment_websocket_namespace_initialized',
  })

  return enrichmentNs
}
