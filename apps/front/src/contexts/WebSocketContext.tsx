import { enrichmentStatusKeys } from '@/api/queries/enrichment/useEnrichmentStatus'
import { listContentKeys } from '@/api/queries/lists/useListContent'
import { placeEnrichmentKeys } from '@/api/queries/places/enrichment/usePlaceEnrichment'
import { userKeys } from '@/api/queries/users/useUserMe'
import { debugLog } from '@/lib/utils/debug-logging'
import { useAuth } from '@clerk/clerk-react'
import type {
  EnrichmentStatusResponse,
  EnrichmentWebSocketClientEvents,
  EnrichmentWebSocketServerEvents,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { type Socket, io } from 'socket.io-client'

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'http://localhost:3030'

// Extract the base domain and path prefix separately
const getSocketConfig = (baseUrl: string) => {
  try {
    const url = new URL(baseUrl)
    const pathPrefix = url.pathname !== '/' ? url.pathname : ''
    const socketPath = pathPrefix ? `${pathPrefix}/socket.io` : '/socket.io'
    // Return just the origin (protocol + domain), not including the path
    const origin = url.origin

    return { origin, socketPath }
  } catch {
    return { origin: baseUrl, socketPath: '/socket.io' }
  }
}

const { origin: WS_ORIGIN, socketPath: SOCKET_PATH } =
  getSocketConfig(WS_BASE_URL)

export type WebSocketStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

// Type-safe socket using @ritchy/types WebSocket event definitions
type EnrichmentSocket = Socket<
  EnrichmentWebSocketServerEvents,
  EnrichmentWebSocketClientEvents
>

interface WebSocketContextValue {
  socket: EnrichmentSocket | null
  status: WebSocketStatus
  isConnected: boolean
  subscribe: (userPlaceId: string) => void
  unsubscribe: (userPlaceId: string) => void
  getSubscriptionCount: () => number
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

/**
 * Singleton WebSocket provider that manages a single connection to the enrichment namespace
 * Prevents duplicate connections and provides subscription management
 *
 * Benefits:
 * - Single WebSocket connection per user (prevents resource leaks)
 * - Centralized subscription tracking
 * - Automatic reconnection with subscription restoration
 * - Shared connection state across all components
 */
export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const socketRef = useRef<EnrichmentSocket | null>(null)
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  const setupInProgressRef = useRef(false)
  const getTokenRef = useRef(getToken)

  // Keep getToken ref up to date without triggering reconnections
  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  // Store subscriptions with reference counting to prevent memory leaks
  // Map<userPlaceId, refCount> - only unsubscribe when refCount reaches 0
  const subscriptionRefsRef = useRef<Map<string, number>>(new Map())

  // Queue for subscriptions requested before connection is established
  // Prevents race condition where subscribe() is called before socket connects
  const pendingSubscriptionsRef = useRef<Set<string>>(new Set())

  const setupWebSocket = useCallback(async () => {
    // Prevent duplicate setup calls
    if (setupInProgressRef.current || socketRef.current?.connected) {
      return
    }

    setupInProgressRef.current = true

    try {
      debugLog('[WS Context] Setting up WebSocket connection...')
      setStatus('connecting')
      const token = await getTokenRef.current()

      if (!token) {
        console.error('[WS Context] No authentication token available')
        setStatus('error')
        setupInProgressRef.current = false
        return
      }

      debugLog(
        '[WS Context] Token acquired, connecting to:',
        `${WS_BASE_URL}/enrichment`,
      )

      // Create socket connection to enrichment namespace with type-safe events
      const socket: EnrichmentSocket = io(`${WS_ORIGIN}/enrichment`, {
        // ← Use WS_ORIGIN instead of WS_BASE_URL
        path: SOCKET_PATH,
        auth: {
          token,
        },
        transports: ['websocket'], // Keep this for debugging
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        timeout: 10000,
      })

      socketRef.current = socket

      // Handle successful connection
      socket.on('connect', () => {
        debugLog('[WS Context] Connected to enrichment namespace', {
          socketId: socket.id,
        })
        setStatus('connected')
        setupInProgressRef.current = false

        // First: Process any pending subscriptions that were queued before connection
        if (pendingSubscriptionsRef.current.size > 0) {
          debugLog(
            '[WS Context] Processing pending subscriptions:',
            Array.from(pendingSubscriptionsRef.current),
          )
          for (const userPlaceId of pendingSubscriptionsRef.current) {
            socket.emit('subscribe', userPlaceId)
          }
          pendingSubscriptionsRef.current.clear()
        }

        // Then: Restore all active subscriptions after connection (reconnection scenario)
        const subsToRestore = Array.from(subscriptionRefsRef.current.keys())
        if (subsToRestore.length > 0) {
          debugLog('[WS Context] Restoring subscriptions:', subsToRestore)
          for (const userPlaceId of subsToRestore) {
            socket.emit('subscribe', userPlaceId)
          }
        }
      })

      // Handle status updates from server
      socket.on(
        'status-update',
        (data: { userPlaceId: string } & EnrichmentStatusResponse) => {
          try {
            debugLog('[WS Context] Received status update:', {
              userPlaceId: data.userPlaceId,
              status: data.status,
              progress: data.progress,
              step: data.step,
            })

            // Update TanStack Query cache with new status
            queryClient.setQueryData<EnrichmentStatusResponse>(
              enrichmentStatusKeys.single(data.userPlaceId),
              {
                status: data.status,
                step: data.step,
                progress: data.progress,
                updatedAt: data.updatedAt,
                error: data.error,
                jobId: data.jobId,
              },
            )

            // Invalidate queries when enrichment completes OR when progress reaches 100
            // Centralized here to prevent duplicate invalidations across multiple components
            if (
              data.status === 'completed' ||
              data.status === 'failed' ||
              data.progress === 100
            ) {
              debugLog(
                '[WS Context] Enrichment finished, invalidating queries:',
                {
                  status: data.status,
                  progress: data.progress,
                  userPlaceId: data.userPlaceId,
                },
              )

              // Invalidate list content to fetch new enriched data
              queryClient.invalidateQueries({ queryKey: listContentKeys.all })

              // Invalidate user data to update credits/usage
              queryClient.invalidateQueries({ queryKey: userKeys.me() })

              // Invalidate place enrichment data to refresh company details
              queryClient.invalidateQueries({
                queryKey: placeEnrichmentKeys.place(data.userPlaceId),
              })
            }

            debugLog('[WS Context] Status update processed successfully')
          } catch (error) {
            console.error(
              '[WS Context] Error processing status update:',
              error,
              data,
            )
          }
        },
      )

      // Handle errors
      socket.on(
        'error',
        (error: { message: string; code?: string; userPlaceId?: string }) => {
          // Handle per-enrichment errors separately (don't break entire connection)
          if (error.code === 'FORBIDDEN' || error.code === 'NOT_FOUND') {
            console.warn(
              `[WS Context] Authorization error for ${error.userPlaceId}:`,
              error.message,
              {
                code: error.code,
                hint: 'This may indicate trying to subscribe to an enrichment you do not own',
              },
            )

            // Remove from subscriptions - don't retry
            if (error.userPlaceId) {
              subscriptionRefsRef.current.delete(error.userPlaceId)
            }

            // Don't set global error status for per-enrichment authorization issues
            return
          }

          // Connection-level errors
          console.error('[WS Context] Connection error:', error)
          setStatus('error')
        },
      )

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.warn('[WS Context] Disconnected:', reason) // Change to console.warn so it's more visible
        setStatus('disconnected')
        setupInProgressRef.current = false

        // Automatic reconnection is handled by socket.io unless explicitly disabled
        if (reason === 'io server disconnect') {
          // Server initiated disconnect - reconnect manually
          console.warn('[WS Context] Server disconnected, reconnecting...')
          socket.connect()
        }
      })

      // Handle reconnection attempts
      socket.io.on('reconnect_attempt', (attempt) => {
        debugLog(`[WS Context] Reconnection attempt ${attempt}`)
        setStatus('connecting')
      })

      // Handle successful reconnection
      socket.io.on('reconnect', (attempt) => {
        debugLog(`[WS Context] Reconnected after ${attempt} attempts`)
        setStatus('connected')

        // Process pending subscriptions first
        if (pendingSubscriptionsRef.current.size > 0) {
          debugLog(
            '[WS Context] Processing pending subscriptions after reconnect:',
            Array.from(pendingSubscriptionsRef.current),
          )
          for (const userPlaceId of pendingSubscriptionsRef.current) {
            socket.emit('subscribe', userPlaceId)
          }
          pendingSubscriptionsRef.current.clear()
        }

        // Re-subscribe to all active subscriptions
        const subsToRestore = Array.from(subscriptionRefsRef.current.keys())
        if (subsToRestore.length > 0) {
          debugLog(
            '[WS Context] Re-subscribing after reconnect:',
            subsToRestore,
          )
          for (const userPlaceId of subsToRestore) {
            socket.emit('subscribe', userPlaceId)
          }
        }
      })

      // Handle failed reconnection
      socket.io.on('reconnect_failed', () => {
        console.error('[WS Context] Failed to reconnect after all attempts')
        setStatus('error')
        setupInProgressRef.current = false
      })

      // Add debug logging
      socket.on('connect_error', (error) => {
        console.error('[WS Context] Connection error:', error.message, error)
      })
    } catch (error) {
      console.error('[WS Context] Failed to set up WebSocket:', error)
      setStatus('error')
      setupInProgressRef.current = false
    }
  }, [queryClient])

  // Initialize WebSocket connection on mount
  useEffect(() => {
    setupWebSocket()

    // Cleanup function
    return () => {
      if (socketRef.current) {
        debugLog('[WS Context] Cleaning up WebSocket connection')
        socketRef.current.disconnect()
        socketRef.current = null
      }
      subscriptionRefsRef.current.clear()
      pendingSubscriptionsRef.current.clear()
      setupInProgressRef.current = false
      setStatus('disconnected')
    }
  }, [setupWebSocket])

  // Subscribe to enrichment updates with reference counting
  const subscribe = useCallback((userPlaceId: string) => {
    if (!userPlaceId) {
      console.warn('[WS Context] Invalid userPlaceId provided to subscribe')
      return
    }

    // Increment reference count
    const currentCount = subscriptionRefsRef.current.get(userPlaceId) || 0
    subscriptionRefsRef.current.set(userPlaceId, currentCount + 1)

    // Only emit subscribe event if this is the first subscription
    if (currentCount === 0) {
      debugLog('[WS Context] Subscribed to:', userPlaceId)

      // Emit subscribe event if connected
      if (socketRef.current?.connected) {
        socketRef.current.emit('subscribe', userPlaceId)
      } else {
        // Queue for later when connection is established
        pendingSubscriptionsRef.current.add(userPlaceId)
        debugLog(
          '[WS Context] Queued subscription (not connected yet):',
          userPlaceId,
        )
      }
    } else {
      debugLog(
        `[WS Context] Incremented subscription ref count for ${userPlaceId}: ${currentCount + 1}`,
      )
    }
  }, [])

  // Unsubscribe from enrichment updates with reference counting
  const unsubscribe = useCallback((userPlaceId: string) => {
    if (!userPlaceId) {
      console.warn('[WS Context] Invalid userPlaceId provided to unsubscribe')
      return
    }

    // Decrement reference count
    const currentCount = subscriptionRefsRef.current.get(userPlaceId) || 0

    if (currentCount <= 1) {
      // Last reference - actually unsubscribe
      subscriptionRefsRef.current.delete(userPlaceId)

      // Also remove from pending queue if it was queued
      pendingSubscriptionsRef.current.delete(userPlaceId)

      debugLog('[WS Context] Unsubscribed from:', userPlaceId)

      // Emit unsubscribe event if connected
      if (socketRef.current?.connected) {
        socketRef.current.emit('unsubscribe', userPlaceId)
      }
    } else {
      // Still have references - just decrement
      subscriptionRefsRef.current.set(userPlaceId, currentCount - 1)
      debugLog(
        `[WS Context] Decremented subscription ref count for ${userPlaceId}: ${currentCount - 1}`,
      )
    }
  }, [])

  // Get current subscription count
  const getSubscriptionCount = useCallback(() => {
    return subscriptionRefsRef.current.size
  }, [])

  const value: WebSocketContextValue = {
    socket: socketRef.current,
    status,
    isConnected: status === 'connected',
    subscribe,
    unsubscribe,
    getSubscriptionCount,
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

/**
 * Hook to access WebSocket context
 * Must be used within WebSocketProvider
 */
export const useWebSocket = (): WebSocketContextValue => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider')
  }
  return context
}
