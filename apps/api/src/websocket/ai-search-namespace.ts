import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { Namespace, Server as SocketIOServer } from 'socket.io'
import { z } from 'zod'
import { db } from '../db/db'
import { search, user } from '../db/schema'
import {
  websocketConnectionsGauge,
  websocketMessagesCounter,
} from '../metrics/collectors'
import { getAISearchProgress } from '../services/ai-search/progress'
import { authenticationMiddleware } from './server'

/**
 * AI Search WebSocket Events
 */
interface AISearchWebSocketClientEvents {
  'ai-search-subscribe': (searchId: string, callback?: () => void) => void
  'ai-search-unsubscribe': (searchId: string) => void
  'ai-search-cancel': (searchId: string) => void
}

interface AISearchWebSocketServerEvents {
  'ai-search-status': (data: {
    searchId: string
    status: 'enriching' | 'complete' | 'error' | 'cancelled'
    progress: { current: number; total: number }
    matches: number
    creditsUsed: number
  }) => void
  'ai-search-progress': (data: {
    searchId: string
    current: number
    total: number
    sequence: number
    updatedAt: number
  }) => void
  'ai-search-match': (data: {
    searchId: string
    place: Record<string, unknown>
    sequence: number
    updatedAt: number
  }) => void
  'ai-search-complete': (data: {
    searchId: string
    summary: {
      totalEvaluated: number
      totalMatches: number
      creditsUsed: number
    }
    sequence: number
    updatedAt: number
  }) => void
  'ai-search-error': (data: {
    searchId: string
    error: string
    code?: string
    sequence?: number
    updatedAt?: number
  }) => void
}

const SearchIdSchema = z.string().uuid()

/**
 * Set up the AI search namespace for real-time progress and result streaming
 */
export const setupAISearchNamespace = (io: SocketIOServer) => {
  const aiSearchNs: Namespace<
    AISearchWebSocketClientEvents,
    AISearchWebSocketServerEvents
  > = io.of('/ai-search')

  aiSearchNs.use(authenticationMiddleware)

  aiSearchNs.on('connection', (socket) => {
    websocketConnectionsGauge.inc({ namespace: 'ai-search' })

    logger.info({
      msg: 'Client connected to AI search namespace',
      event: 'ai_search_websocket_connect',
      metadata: { socketId: socket.id, userId: socket.data.userId },
    })

    /**
     * Subscribe to AI search updates
     * Verifies ownership before joining room
     */
    socket.on(
      'ai-search-subscribe',
      async (searchId: string, callback?: () => void) => {
        websocketMessagesCounter.inc({
          namespace: 'ai-search',
          event_type: 'ai-search-subscribe',
          direction: 'inbound',
        })

        try {
          const validatedSearchId = SearchIdSchema.parse(searchId)

          // Verify ownership by joining search with user table and checking clerkId
          const [searchResult] = await db
            .select({ id: search.id })
            .from(search)
            .innerJoin(user, eq(search.userId, user.id))
            .where(
              and(
                eq(search.id, validatedSearchId),
                eq(user.clerkId, socket.data.userId),
              ),
            )
            .limit(1)

          if (!searchResult) {
            logger.warn({
              msg: 'AI search subscription denied - not found or unauthorized',
              event: 'ai_search_websocket_subscribe_denied',
              metadata: {
                socketId: socket.id,
                clerkId: socket.data.userId,
                searchId: validatedSearchId,
              },
            })

            socket.emit('ai-search-error', {
              searchId: validatedSearchId,
              error: 'Search not found',
              code: 'NOT_FOUND',
            })
            return
          }

          // Join the room for this search
          const room = `ai-search:${validatedSearchId}`
          await socket.join(room)

          // Send current status
          const progress = await getAISearchProgress(validatedSearchId)
          const status =
            progress.total > 0 && progress.evaluated >= progress.total
              ? 'complete'
              : progress.total > 0
                ? 'enriching'
                : 'enriching'

          socket.emit('ai-search-status', {
            searchId: validatedSearchId,
            status,
            progress: {
              current: progress.evaluated,
              total: progress.total,
            },
            matches: progress.matched,
            creditsUsed: progress.creditsUsed,
          })

          websocketMessagesCounter.inc({
            namespace: 'ai-search',
            event_type: 'ai-search-status',
            direction: 'outbound',
          })

          logger.info({
            msg: 'Client subscribed to AI search updates',
            event: 'ai_search_websocket_subscribed',
            metadata: {
              socketId: socket.id,
              userId: socket.data.userId,
              searchId: validatedSearchId,
              room,
            },
          })

          // Call acknowledgment callback if provided
          if (callback) {
            callback()
          }
        } catch (error) {
          logger.error({
            msg: 'Failed to process AI search subscription',
            event: 'ai_search_websocket_subscribe_error',
            metadata: {
              socketId: socket.id,
              searchId,
              error: error instanceof Error ? error.message : String(error),
            },
          })

          socket.emit('ai-search-error', {
            searchId,
            error: 'Invalid subscription request',
            code: 'INVALID_REQUEST',
          })
        }
      },
    )

    /**
     * Unsubscribe from AI search updates
     */
    socket.on('ai-search-unsubscribe', async (searchId: string) => {
      websocketMessagesCounter.inc({
        namespace: 'ai-search',
        event_type: 'ai-search-unsubscribe',
        direction: 'inbound',
      })

      try {
        const validatedSearchId = SearchIdSchema.parse(searchId)
        const room = `ai-search:${validatedSearchId}`

        await socket.leave(room)

        logger.debug({
          msg: 'Client unsubscribed from AI search updates',
          event: 'ai_search_websocket_unsubscribed',
          metadata: {
            socketId: socket.id,
            userId: socket.data.userId,
            searchId: validatedSearchId,
          },
        })
      } catch (error) {
        logger.error({
          msg: 'Failed to process AI search unsubscription',
          event: 'ai_search_websocket_unsubscribe_error',
          metadata: {
            socketId: socket.id,
            searchId,
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    })

    /**
     * Cancel an in-progress AI search
     * TODO: Implement cancellation logic
     */
    socket.on('ai-search-cancel', async (searchId: string) => {
      websocketMessagesCounter.inc({
        namespace: 'ai-search',
        event_type: 'ai-search-cancel',
        direction: 'inbound',
      })

      try {
        const validatedSearchId = SearchIdSchema.parse(searchId)

        // Verify ownership by joining search with user table and checking clerkId
        const [searchResult] = await db
          .select({ id: search.id })
          .from(search)
          .innerJoin(user, eq(search.userId, user.id))
          .where(
            and(
              eq(search.id, validatedSearchId),
              eq(user.clerkId, socket.data.userId),
            ),
          )
          .limit(1)

        if (!searchResult) {
          socket.emit('ai-search-error', {
            searchId: validatedSearchId,
            error: 'Search not found',
            code: 'NOT_FOUND',
          })
          return
        }

        // TODO: Implement cancellation
        // 1. Mark search as cancelled in database
        // 2. Cancel pending enrichment jobs in BullMQ
        // 3. Refund credits for jobs that haven't started
        // 4. Emit cancellation event

        logger.info({
          msg: 'AI search cancellation requested',
          event: 'ai_search_websocket_cancel_requested',
          metadata: {
            socketId: socket.id,
            userId: socket.data.userId,
            searchId: validatedSearchId,
          },
        })

        // For now, just acknowledge the request
        socket.emit('ai-search-status', {
          searchId: validatedSearchId,
          status: 'cancelled',
          progress: { current: 0, total: 0 },
          matches: 0,
          creditsUsed: 0,
        })
      } catch (error) {
        logger.error({
          msg: 'Failed to process AI search cancellation',
          event: 'ai_search_websocket_cancel_error',
          metadata: {
            socketId: socket.id,
            searchId,
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    })

    socket.on('disconnect', (reason) => {
      websocketConnectionsGauge.dec({ namespace: 'ai-search' })

      logger.info({
        msg: 'Client disconnected from AI search namespace',
        event: 'ai_search_websocket_disconnect',
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
        msg: 'WebSocket error in AI search namespace',
        event: 'ai_search_websocket_error',
        metadata: {
          socketId: socket.id,
          userId: socket.data.userId,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    })
  })

  logger.info({
    msg: 'AI search WebSocket namespace initialized',
    event: 'ai_search_websocket_namespace_initialized',
  })

  return aiSearchNs
}
