import { batchEnrichmentStatusKeys } from '@/api/queries/enrichment/useBatchEnrichmentStatus'
import { enrichmentStatusKeys } from '@/api/queries/enrichment/useEnrichmentStatus'
import { listContentKeys } from '@/api/queries/lists/useListContent'
import { placeEnrichmentKeys } from '@/api/queries/places/enrichment/usePlaceEnrichment'
import { placeKeys } from '@/api/queries/places/usePlace'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import { userKeys } from '@/api/queries/users/useUserMe'
import { webApiClient } from '@/hooks/useApi'
import { debugLog } from '@/lib/utils/debug-logging'
import { useAuth } from '@clerk/clerk-react'
import type {
  BatchEnrichmentStatusResponse,
  EnrichmentStatusResponse,
  EnrichmentWebSocketClientEvents,
  EnrichmentWebSocketServerEvents,
  GetListContentApiResponse,
  GetPlaceApiResponse,
  GetSearchContentApiResponse,
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

  // Track processed completions to prevent duplicate processing
  // Map<userPlaceId, { timestamp, status }> - cleared after successful processing
  const processedCompletionsRef = useRef<
    Map<string, { timestamp: number; status: string }>
  >(new Map())

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
        async (data: { userPlaceId: string } & EnrichmentStatusResponse) => {
          try {
            debugLog('[WS Context] Received status update:', {
              userPlaceId: data.userPlaceId,
              status: data.status,
              progress: data.progress,
              step: data.step,
            })

            // Update TanStack Query cache with new status
            // 1. Update single enrichment status cache (legacy support)
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

            // 2. Update all batch enrichment status caches that contain this userPlaceId
            queryClient.setQueriesData<BatchEnrichmentStatusResponse>(
              { queryKey: batchEnrichmentStatusKeys.all },
              (oldData) => {
                // Only update if this batch contains the userPlaceId
                if (!oldData || !(data.userPlaceId in oldData)) {
                  return oldData
                }

                debugLog(
                  '[WS Context] Updating batch cache for userPlaceId:',
                  data.userPlaceId,
                  {
                    status: data.status,
                    progress: data.progress,
                  },
                )

                // Update the specific status within the batch
                return {
                  ...oldData,
                  [data.userPlaceId]: {
                    status: data.status,
                    step: data.step,
                    progress: data.progress,
                    updatedAt: data.updatedAt,
                    error: data.error,
                    jobId: data.jobId,
                  },
                }
              },
            )

            // Optimistically update place data when enrichment completes
            if (
              data.status === 'completed' ||
              data.status === 'failed' ||
              data.progress === 100
            ) {
              // Check if we've already processed this completion
              const lastProcessed = processedCompletionsRef.current.get(
                data.userPlaceId,
              )
              if (
                lastProcessed &&
                lastProcessed.status === data.status &&
                lastProcessed.timestamp === data.updatedAt
              ) {
                debugLog(
                  '[WS Context] Skipping duplicate completion event',
                  data.userPlaceId,
                )
                return
              }

              const now = Date.now()
              const completionAge = now - data.updatedAt
              const isRecentCompletion = completionAge < 1000 // 1 seconds
              if (!isRecentCompletion) {
                debugLog('[WS Context] Skipping refetch for old completion', {
                  userPlaceId: data.userPlaceId,
                  completionAge,
                  updatedAt: data.updatedAt,
                  now,
                })
                return
              }

              debugLog(
                '[WS Context] Enrichment finished, updating place optimistically:',
                {
                  status: data.status,
                  progress: data.progress,
                  userPlaceId: data.userPlaceId,
                },
              )

              // Mark this completion as processed
              processedCompletionsRef.current.set(data.userPlaceId, {
                timestamp: data.updatedAt,
                status: data.status,
              })

              // Always invalidate user data to update credits/usage
              queryClient.invalidateQueries({ queryKey: userKeys.me() })
              try {
                // Fetch fresh place data using queryClient.fetchQuery
                const token = await getTokenRef.current()
                const placeData =
                  await queryClient.fetchQuery<GetPlaceApiResponse>({
                    queryKey: placeKeys.place(data.userPlaceId),
                    queryFn: async () => {
                      return webApiClient.fetchWithAuth<GetPlaceApiResponse>(
                        `/places/${data.userPlaceId}`,
                        { method: 'GET' },
                        token,
                      )
                    },
                    staleTime: 0, // Always fetch fresh data
                  })

                if ('error' in placeData) {
                  throw new Error('Failed to fetch place')
                }

                const updatedPlace = placeData.place

                // Update all list content queries that contain this place
                queryClient.setQueriesData<GetListContentApiResponse>(
                  { queryKey: listContentKeys.all },
                  (oldData) => {
                    if (!oldData || 'error' in oldData) return oldData

                    const placeIndex = oldData.items.findIndex(
                      (p) => p.id === data.userPlaceId,
                    )

                    if (placeIndex === -1) return oldData

                    const newItems = [...oldData.items]
                    newItems[placeIndex] = updatedPlace

                    return {
                      ...oldData,
                      items: newItems,
                    }
                  },
                )

                // Update all search content queries that contain this place
                // GetSearchContentApiResponse is an array of places
                queryClient.setQueriesData<GetSearchContentApiResponse>(
                  { queryKey: searchContentKeys.all },
                  (oldData) => {
                    if (!oldData || 'error' in oldData) return oldData

                    const placeIndex = oldData.findIndex(
                      (p) => p.id === data.userPlaceId,
                    )

                    if (placeIndex === -1) return oldData

                    const newPlaces = [...oldData]
                    newPlaces[placeIndex] = updatedPlace

                    return newPlaces
                  },
                )

                debugLog(
                  '[WS Context] Optimistic update completed successfully',
                )

                // Clear processed completion after successful update
                // Allow re-processing if a new completion event arrives
                setTimeout(() => {
                  processedCompletionsRef.current.delete(data.userPlaceId)
                }, 5000) // Clear after 5 seconds
              } catch (error) {
                console.error(
                  '[WS Context] Failed to fetch updated place, retrying with fallback:',
                  error,
                )

                // Remove from processed completions to allow retry
                processedCompletionsRef.current.delete(data.userPlaceId)

                // Retry with exponential backoff (max 3 attempts)
                const retryWithBackoff = async (
                  attempt = 1,
                  maxAttempts = 3,
                ) => {
                  if (attempt > maxAttempts) {
                    console.error(
                      '[WS Context] Max retry attempts reached, falling back to invalidation',
                    )
                    // Final fallback: invalidate queries
                    queryClient.invalidateQueries({
                      queryKey: listContentKeys.all,
                    })
                    queryClient.invalidateQueries({
                      queryKey: searchContentKeys.all,
                    })
                    return
                  }

                  const backoffDelay = Math.min(1000 * 2 ** (attempt - 1), 5000) // 1s, 2s, 4s (max 5s)
                  debugLog(
                    `[WS Context] Retrying fetch in ${backoffDelay}ms (attempt ${attempt}/${maxAttempts})`,
                  )

                  await new Promise((resolve) =>
                    setTimeout(resolve, backoffDelay),
                  )

                  try {
                    const token = await getTokenRef.current()
                    const placeData =
                      await queryClient.fetchQuery<GetPlaceApiResponse>({
                        queryKey: placeKeys.place(data.userPlaceId),
                        queryFn: async () => {
                          return webApiClient.fetchWithAuth<GetPlaceApiResponse>(
                            `/places/${data.userPlaceId}`,
                            { method: 'GET' },
                            token,
                          )
                        },
                        staleTime: 0,
                      })

                    if ('error' in placeData) {
                      throw new Error('Failed to fetch place')
                    }

                    const updatedPlace = placeData.place

                    // Update list content queries
                    queryClient.setQueriesData<GetListContentApiResponse>(
                      { queryKey: listContentKeys.all },
                      (oldData) => {
                        if (!oldData || 'error' in oldData) return oldData

                        const placeIndex = oldData.items.findIndex(
                          (p) => p.id === data.userPlaceId,
                        )
                        if (placeIndex === -1) return oldData

                        const newItems = [...oldData.items]
                        newItems[placeIndex] = updatedPlace
                        return { ...oldData, items: newItems }
                      },
                    )

                    // Update search content queries
                    queryClient.setQueriesData<GetSearchContentApiResponse>(
                      { queryKey: searchContentKeys.all },
                      (oldData) => {
                        if (!oldData || 'error' in oldData) return oldData

                        const placeIndex = oldData.findIndex(
                          (p) => p.id === data.userPlaceId,
                        )
                        if (placeIndex === -1) return oldData

                        const newPlaces = [...oldData]
                        newPlaces[placeIndex] = updatedPlace
                        return newPlaces
                      },
                    )

                    debugLog(
                      `[WS Context] Retry successful on attempt ${attempt}`,
                    )
                  } catch (retryError) {
                    console.error(
                      `[WS Context] Retry attempt ${attempt} failed:`,
                      retryError,
                    )
                    await retryWithBackoff(attempt + 1, maxAttempts)
                  }
                }

                // Start retry process
                await retryWithBackoff()
              }

              // Always invalidate place enrichment data to refresh company details
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
      socket.io.on('reconnect_attempt', async (attempt) => {
        debugLog(`[WS Context] Reconnection attempt ${attempt}`)
        setStatus('connecting')

        // Refresh token before reconnection to avoid expired JWT errors
        try {
          const freshToken = await getTokenRef.current()
          if (freshToken && socket.auth && typeof socket.auth === 'object') {
            ;(socket.auth as { token: string }).token = freshToken
            debugLog('[WS Context] Token refreshed for reconnection')
          }
        } catch (error) {
          console.error(
            '[WS Context] Failed to refresh token for reconnection:',
            error,
          )
        }
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

      // Handle connection errors (including expired JWT)
      socket.on('connect_error', async (error) => {
        console.error('[WS Context] Connection error:', error.message, error)

        // If authentication failed, try refreshing the token
        if (
          error.message.includes('Authentication') ||
          error.message.includes('token')
        ) {
          debugLog(
            '[WS Context] Authentication error detected, refreshing token...',
          )

          try {
            const freshToken = await getTokenRef.current()
            if (freshToken && socket.auth && typeof socket.auth === 'object') {
              ;(socket.auth as { token: string }).token = freshToken
              debugLog('[WS Context] Token refreshed after auth error')
            }
          } catch (tokenError) {
            console.error(
              '[WS Context] Failed to refresh token after auth error:',
              tokenError,
            )
          }
        }
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

    // Proactive token refresh every 45 minutes to prevent expiration
    // Clerk JWTs typically expire after 1 hour, so refresh at 45min keeps us safe
    const tokenRefreshInterval = setInterval(
      async () => {
        if (socketRef.current?.connected) {
          try {
            debugLog('[WS Context] Proactively refreshing token...')
            const freshToken = await getTokenRef.current()
            if (
              freshToken &&
              socketRef.current.auth &&
              typeof socketRef.current.auth === 'object'
            ) {
              ;(socketRef.current.auth as { token: string }).token = freshToken
              debugLog('[WS Context] Token proactively refreshed')
            }
          } catch (error) {
            console.error(
              '[WS Context] Failed to proactively refresh token:',
              error,
            )
          }
        }
      },
      45 * 60 * 1000,
    ) // 45 minutes

    // Cleanup function
    return () => {
      clearInterval(tokenRefreshInterval)

      if (socketRef.current) {
        debugLog('[WS Context] Cleaning up WebSocket connection')
        socketRef.current.disconnect()
        socketRef.current = null
      }
      subscriptionRefsRef.current.clear()
      pendingSubscriptionsRef.current.clear()
      processedCompletionsRef.current.clear()
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
