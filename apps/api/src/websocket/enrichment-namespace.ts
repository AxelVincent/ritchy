import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { Server as SocketIOServer } from 'socket.io'
import { z } from 'zod'
import { db } from '../db/db'
import { userPlace as userPlaceTable, user as userTable } from '../db/schema'
import { getEnrichmentStatus } from '../services/enrichment/status_manager'
import { authenticationMiddleware } from './server'

// Validation schemas for WebSocket events
const SubscribeEventSchema = z.string().uuid()
const UnsubscribeEventSchema = z.string().uuid()

/**
 * Set up the enrichment namespace for real-time status updates
 * Handles subscription management and broadcasting enrichment progress
 */
export const setupEnrichmentNamespace = (io: SocketIOServer) => {
  // Create /enrichment namespace for enrichment-specific events
  const enrichmentNs = io.of('/enrichment')

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

        // Verify ownership: Check if the authenticated user owns this userPlace
        const [result] = await db
          .select({
            userPlaceId: userPlaceTable.id,
            userId: userPlaceTable.user_id,
            clerkId: userTable.clerkId,
          })
          .from(userPlaceTable)
          .innerJoin(userTable, eq(userPlaceTable.user_id, userTable.id))
          .where(eq(userPlaceTable.id, validatedId))
          .limit(1)

        logger.debug({
          msg: 'Authorization check for subscription',
          event: 'enrichment_websocket_subscribe_auth_check',
          metadata: {
            socketId: socket.id,
            authenticatedUserId: socket.data.userId,
            userPlaceId: validatedId,
            foundResult: !!result,
            resultClerkId: result?.clerkId,
            idsMatch: result?.clerkId === socket.data.userId,
          },
        })

        if (!result) {
          logger.warn({
            msg: 'Subscription attempt for non-existent userPlace',
            event: 'enrichment_websocket_subscribe_not_found',
            metadata: {
              socketId: socket.id,
              userId: socket.data.userId,
              userPlaceId: validatedId,
            },
          })

          socket.emit('error', {
            message: 'User place not found',
            code: 'NOT_FOUND',
            userPlaceId: validatedId,
          })
          return
        }

        // Check if authenticated user owns this userPlace
        if (result.clerkId !== socket.data.userId) {
          logger.warn({
            msg: 'Unauthorized subscription attempt',
            event: 'enrichment_websocket_subscribe_unauthorized',
            metadata: {
              socketId: socket.id,
              authenticatedUserId: socket.data.userId,
              userPlaceId: validatedId,
              actualOwnerId: result.clerkId,
              authenticatedUserIdType: typeof socket.data.userId,
              actualOwnerIdType: typeof result.clerkId,
              authenticatedUserIdLength: socket.data.userId?.length,
              actualOwnerIdLength: result.clerkId?.length,
            },
          })

          socket.emit('error', {
            message: 'Unauthorized: You do not own this enrichment',
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

        // Verify ownership before unsubscribing (optional but good for audit trail)
        const [result] = await db
          .select({
            userPlaceId: userPlaceTable.id,
            clerkId: userTable.clerkId,
          })
          .from(userPlaceTable)
          .innerJoin(userTable, eq(userPlaceTable.user_id, userTable.id))
          .where(eq(userPlaceTable.id, validatedId))
          .limit(1)

        // If the userPlace doesn't exist or user doesn't own it, still allow unsubscribe
        // (graceful handling - prevents clients from staying subscribed to unauthorized rooms)
        if (result && result.clerkId !== socket.data.userId) {
          logger.warn({
            msg: 'Unsubscribe from unauthorized userPlace',
            event: 'enrichment_websocket_unsubscribe_unauthorized',
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
