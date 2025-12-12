import { enrichmentStatusKeys } from '@/api/queries/enrichment/useEnrichmentStatus'
import { placeEnrichmentKeys } from '@/api/queries/places/enrichment/usePlaceEnrichment'
import { placeKeys } from '@/api/queries/places/usePlace'
import { userPlacesKeys } from '@/api/queries/user-places/useUserPlaces'
import { userKeys } from '@/api/queries/users/useUserMe'
import { webApiClient } from '@/hooks/useApi'
import { debugLog } from '@/lib/utils/debug-logging'
import { useAuth } from '@clerk/clerk-react'
import type {
  BatchEnrichmentStatusResponse,
  BatchStatusUpdate,
  EnrichmentStatusResponse,
  EnrichmentWebSocketClientEvents,
  EnrichmentWebSocketServerEvents,
  GetPlaceApiResponse,
  GetUserPlacesApiResponse,
} from '@ritchy/types'
import { type QueryClient, useQueryClient } from '@tanstack/react-query'
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

/**
 * Helper to update all batch enrichment status caches
 * Uses getQueryCache().findAll() for reliable query matching and re-render notifications
 */
const updateBatchEnrichmentStatusCaches = (
  queryClient: QueryClient,
  updateFn: (
    oldData: BatchEnrichmentStatusResponse | undefined,
  ) => BatchEnrichmentStatusResponse | undefined,
) => {
  const queries = queryClient.getQueryCache().findAll({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === 'batch-enrichment-status',
  })

  for (const query of queries) {
    queryClient.setQueryData<BatchEnrichmentStatusResponse>(
      query.queryKey,
      updateFn,
    )
  }
}

/**
 * Helper to update all user places caches
 * Uses getQueryCache().findAll() for reliable query matching and re-render notifications
 */
const updateUserPlacesCaches = (
  queryClient: QueryClient,
  updateFn: (
    oldData: GetUserPlacesApiResponse | undefined,
  ) => GetUserPlacesApiResponse | undefined,
) => {
  const queries = queryClient.getQueryCache().findAll({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === userPlacesKeys.all[0],
  })

  for (const query of queries) {
    queryClient.setQueryData<GetUserPlacesApiResponse>(query.queryKey, updateFn)
  }
}

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'http://localhost:3030'

// Extract the base domain and path prefix separately
const getSocketConfig = (baseUrl: string) => {
  try {
    const url = new URL(baseUrl)
    const pathPrefix = url.pathname !== '/' ? url.pathname : ''
    const socketPath = pathPrefix ? `${pathPrefix}/socket.io` : '/socket.io'
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
  // Subscribe to a set of IDs with a unique source key
  // Multiple sources can subscribe independently, subscriptions are merged
  subscribe: (sourceKey: string, userPlaceIds: string[]) => void
  // Unsubscribe a source (e.g., on component unmount)
  unsubscribe: (sourceKey: string) => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

/**
 * Simplified WebSocket provider for enrichment status updates
 *
 * v2 Architecture:
 * - Single batch-subscribe event replaces all current subscriptions
 * - No reference counting needed - server manages room membership atomically
 * - Reconnection simply re-sends current subscription set
 * - Eliminates race conditions from individual subscribe/unsubscribe
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

  // Subscriptions by source - allows multiple components to subscribe independently
  // Key: source identifier (e.g., 'dataTable', 'placeDetail')
  // Value: Set of userPlaceIds subscribed by that source
  const subscriptionsBySourceRef = useRef<Map<string, Set<string>>>(new Map())

  // Computed merged subscriptions (all unique IDs across all sources)
  const getMergedSubscriptions = useCallback((): string[] => {
    const allIds = new Set<string>()
    for (const ids of subscriptionsBySourceRef.current.values()) {
      for (const id of ids) {
        allIds.add(id)
      }
    }
    return Array.from(allIds)
  }, [])

  // Track processed completions to prevent duplicate processing
  const processedCompletionsRef = useRef<
    Map<string, { timestamp: number; status: string }>
  >(new Map())

  const setupWebSocket = useCallback(async () => {
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

      const socket: EnrichmentSocket = io(`${WS_ORIGIN}/enrichment`, {
        path: SOCKET_PATH,
        auth: { token },
        transports: ['websocket'],
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

        // Restore subscriptions on reconnect
        const mergedSubs = getMergedSubscriptions()
        if (mergedSubs.length > 0) {
          debugLog('[WS Context] Restoring subscriptions:', mergedSubs.length)
          socket.emit('batch-subscribe', mergedSubs)
        }
      })

      // Handle batch status updates (initial status after subscription)
      socket.on('batch-status-update', (data: BatchStatusUpdate) => {
        debugLog('[WS Context] Received batch status update:', {
          count: Object.keys(data).length,
        })

        // Update all batch enrichment status caches
        updateBatchEnrichmentStatusCaches(queryClient, (oldData) => {
          if (!oldData) return oldData
          return { ...oldData, ...data }
        })

        // Also update individual status caches
        for (const [userPlaceId, statusData] of Object.entries(data)) {
          queryClient.setQueryData<EnrichmentStatusResponse>(
            enrichmentStatusKeys.single(userPlaceId),
            statusData,
          )
        }
      })

      // Handle individual status updates (real-time during enrichment)
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

            // Update single enrichment status cache
            const statusUpdate: EnrichmentStatusResponse = {
              status: data.status,
              step: data.step,
              progress: data.progress,
              updatedAt: data.updatedAt,
              error: data.error,
              jobId: data.jobId,
            }

            queryClient.setQueryData<EnrichmentStatusResponse>(
              enrichmentStatusKeys.single(data.userPlaceId),
              statusUpdate,
            )

            // Update all batch enrichment status caches
            updateBatchEnrichmentStatusCaches(queryClient, (oldData) => {
              if (!oldData) return oldData
              return {
                ...oldData,
                [data.userPlaceId]: statusUpdate,
              }
            })

            // Handle completion/failure - refresh place data
            if (
              data.status === 'completed' ||
              data.status === 'failed' ||
              data.progress === 100
            ) {
              // Deduplication check
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
              if (completionAge >= 1000) {
                debugLog('[WS Context] Skipping refetch for old completion', {
                  userPlaceId: data.userPlaceId,
                  completionAge,
                })
                return
              }

              debugLog('[WS Context] Enrichment finished, updating place:', {
                status: data.status,
                userPlaceId: data.userPlaceId,
              })

              // Mark as processed
              processedCompletionsRef.current.set(data.userPlaceId, {
                timestamp: data.updatedAt,
                status: data.status,
              })

              // Invalidate user data to update credits/usage
              queryClient.invalidateQueries({ queryKey: userKeys.me() })

              try {
                // Fetch fresh place data
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

                // Update all user places caches using findAll pattern for reliable matching
                updateUserPlacesCaches(queryClient, (oldData) => {
                  if (!oldData || 'error' in oldData) return oldData

                  const placeIndex = oldData.items.findIndex(
                    (p) => p.id === data.userPlaceId,
                  )
                  if (placeIndex === -1) return oldData

                  const newItems = [...oldData.items]
                  newItems[placeIndex] = updatedPlace

                  return { ...oldData, items: newItems }
                })

                debugLog('[WS Context] Optimistic update completed')

                // Clear processed completion after delay
                setTimeout(() => {
                  processedCompletionsRef.current.delete(data.userPlaceId)
                }, 5000)
              } catch (error) {
                console.error(
                  '[WS Context] Failed to fetch updated place:',
                  error,
                )
                processedCompletionsRef.current.delete(data.userPlaceId)

                // Fallback: invalidate queries
                queryClient.invalidateQueries({ queryKey: userPlacesKeys.all })
              }

              // Always invalidate place enrichment data
              queryClient.invalidateQueries({
                queryKey: placeEnrichmentKeys.place(data.userPlaceId),
              })
            }
          } catch (error) {
            console.error('[WS Context] Error processing status update:', error)
          }
        },
      )

      // Handle errors
      socket.on(
        'error',
        (error: { message: string; code?: string; userPlaceId?: string }) => {
          if (error.code === 'FORBIDDEN' || error.code === 'NOT_FOUND') {
            console.warn(
              `[WS Context] Authorization error for ${error.userPlaceId}:`,
              error.message,
            )
            return
          }

          console.error('[WS Context] Connection error:', error)
          setStatus('error')
        },
      )

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.warn('[WS Context] Disconnected:', reason)
        setStatus('disconnected')
        setupInProgressRef.current = false

        if (reason === 'io server disconnect') {
          console.warn('[WS Context] Server disconnected, reconnecting...')
          socket.connect()
        }
      })

      // Handle reconnection attempts
      socket.io.on('reconnect_attempt', async (attempt) => {
        debugLog(`[WS Context] Reconnection attempt ${attempt}`)
        setStatus('connecting')

        try {
          const freshToken = await getTokenRef.current()
          if (freshToken && socket.auth && typeof socket.auth === 'object') {
            ;(socket.auth as { token: string }).token = freshToken
            debugLog('[WS Context] Token refreshed for reconnection')
          }
        } catch (error) {
          console.error('[WS Context] Failed to refresh token:', error)
        }
      })

      // Handle successful reconnection
      socket.io.on('reconnect', (attempt) => {
        debugLog(`[WS Context] Reconnected after ${attempt} attempts`)
        setStatus('connected')

        // Re-subscribe to current subscriptions
        const mergedSubs = getMergedSubscriptions()
        if (mergedSubs.length > 0) {
          debugLog(
            '[WS Context] Re-subscribing after reconnect:',
            mergedSubs.length,
          )
          socket.emit('batch-subscribe', mergedSubs)
        }
      })

      // Handle failed reconnection
      socket.io.on('reconnect_failed', () => {
        console.error('[WS Context] Failed to reconnect after all attempts')
        setStatus('error')
        setupInProgressRef.current = false
      })

      // Handle connection errors
      socket.on('connect_error', async (error) => {
        console.error('[WS Context] Connection error:', error.message)

        if (
          error.message.includes('Authentication') ||
          error.message.includes('token')
        ) {
          debugLog('[WS Context] Auth error, refreshing token...')

          try {
            const freshToken = await getTokenRef.current()
            if (freshToken && socket.auth && typeof socket.auth === 'object') {
              ;(socket.auth as { token: string }).token = freshToken
            }
          } catch (tokenError) {
            console.error('[WS Context] Failed to refresh token:', tokenError)
          }
        }
      })
    } catch (error) {
      console.error('[WS Context] Failed to set up WebSocket:', error)
      setStatus('error')
      setupInProgressRef.current = false
    }
  }, [queryClient, getMergedSubscriptions])

  // Initialize WebSocket connection on mount
  useEffect(() => {
    setupWebSocket()

    // Proactive token refresh every 45 minutes
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
            console.error('[WS Context] Failed to refresh token:', error)
          }
        }
      },
      45 * 60 * 1000,
    )

    return () => {
      clearInterval(tokenRefreshInterval)

      if (socketRef.current) {
        debugLog('[WS Context] Cleaning up WebSocket connection')
        socketRef.current.disconnect()
        socketRef.current = null
      }
      subscriptionsBySourceRef.current.clear()
      processedCompletionsRef.current.clear()
      setupInProgressRef.current = false
      setStatus('disconnected')
    }
  }, [setupWebSocket])

  // Helper to emit merged subscriptions to server
  const emitMergedSubscriptions = useCallback(() => {
    const mergedSubs = getMergedSubscriptions()
    debugLog('[WS Context] Emitting merged subscriptions:', mergedSubs.length)

    if (socketRef.current?.connected) {
      socketRef.current.emit('batch-subscribe', mergedSubs)
    } else {
      debugLog(
        '[WS Context] Not connected, subscriptions will be sent on connect',
      )
    }
  }, [getMergedSubscriptions])

  // Subscribe to IDs from a specific source
  // Multiple sources can subscribe independently, all subscriptions are merged
  const subscribe = useCallback(
    (sourceKey: string, userPlaceIds: string[]) => {
      const currentSourceIds = subscriptionsBySourceRef.current.get(sourceKey)
      const newIdsSet = new Set(userPlaceIds)

      // Check if this source's subscriptions have changed
      const idsChanged =
        !currentSourceIds ||
        currentSourceIds.size !== newIdsSet.size ||
        !userPlaceIds.every((id) => currentSourceIds.has(id))

      if (!idsChanged) {
        debugLog(
          `[WS Context] Skipping subscribe for ${sourceKey} - IDs unchanged`,
        )
        return
      }

      // Update this source's subscriptions
      subscriptionsBySourceRef.current.set(sourceKey, newIdsSet)
      debugLog(
        `[WS Context] Source ${sourceKey} subscribed to:`,
        userPlaceIds.length,
      )

      // Emit merged subscriptions to server
      emitMergedSubscriptions()
    },
    [emitMergedSubscriptions],
  )

  // Unsubscribe a source (e.g., on component unmount)
  const unsubscribe = useCallback(
    (sourceKey: string) => {
      if (!subscriptionsBySourceRef.current.has(sourceKey)) {
        return
      }

      subscriptionsBySourceRef.current.delete(sourceKey)
      debugLog(`[WS Context] Source ${sourceKey} unsubscribed`)

      // Emit merged subscriptions to server (without this source's IDs)
      emitMergedSubscriptions()
    },
    [emitMergedSubscriptions],
  )

  const value: WebSocketContextValue = {
    socket: socketRef.current,
    status,
    isConnected: status === 'connected',
    subscribe,
    unsubscribe,
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
