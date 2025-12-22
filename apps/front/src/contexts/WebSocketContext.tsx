import { enrichmentStatusKeys } from '@/api/queries/enrichment/useEnrichmentStatus'
import { placeEnrichmentKeys } from '@/api/queries/places/enrichment/usePlaceEnrichment'
import { placeKeys } from '@/api/queries/places/usePlace'
import { userPlacesKeys } from '@/api/queries/user-places/useUserPlaces'
import { userKeys } from '@/api/queries/users/useUserMe'
import { webApiClient } from '@/hooks/useApi'
import { debugLog } from '@/lib/utils/debug-logging'
import { LRUCache } from '@/lib/utils/lru-cache'
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
  useMemo,
  useRef,
  useState,
} from 'react'
import { type Socket, io } from 'socket.io-client'

// Debounce utility
const debounce = <T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'http://localhost:3030'

const getSocketConfig = (baseUrl: string) => {
  try {
    const url = new URL(baseUrl)
    const pathPrefix = url.pathname !== '/' ? url.pathname : ''
    const socketPath = pathPrefix ? `${pathPrefix}/socket.io` : '/socket.io'
    return { origin: url.origin, socketPath }
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

type EnrichmentSocket = Socket<
  EnrichmentWebSocketServerEvents,
  EnrichmentWebSocketClientEvents
>

interface WebSocketContextValue {
  socket: EnrichmentSocket | null
  status: WebSocketStatus
  isConnected: boolean
  subscribe: (sourceKey: string, userPlaceIds: string[]) => void
  unsubscribe: (sourceKey: string) => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

// Cache update helper for user places
const updateUserPlacesCaches = (
  queryClient: QueryClient,
  updateFn: (
    old: GetUserPlacesApiResponse | undefined,
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

/**
 * WebSocket provider for enrichment status updates
 *
 * Features:
 * - Source-based subscription merging (multiple components can subscribe independently)
 * - Debounced subscription emissions (50ms window to batch rapid changes)
 * - Sequence-based message ordering (prevents out-of-order updates)
 * - LRU cache for completion deduplication (bounded memory)
 * - Indexed cache updates (O(1) per entity)
 */
export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const socketRef = useRef<EnrichmentSocket | null>(null)
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  const setupInProgressRef = useRef(false)
  const getTokenRef = useRef(getToken)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  // Subscriptions by source
  const subscriptionsBySourceRef = useRef<Map<string, Set<string>>>(new Map())

  // Index: userPlaceId -> Set of query keys that contain it
  const queryIndexRef = useRef<Map<string, Set<readonly string[]>>>(new Map())

  // Sequence tracking for ordering
  const lastSequenceRef = useRef(new Map<string, number>())

  // LRU cache for completion deduplication (max 500 entries)
  const processedCompletionsRef = useRef(
    new LRUCache<string, { timestamp: number; status: string }>(500),
  )

  const getMergedSubscriptions = useCallback((): string[] => {
    const allIds = new Set<string>()
    for (const ids of subscriptionsBySourceRef.current.values()) {
      for (const id of ids) {
        allIds.add(id)
      }
    }
    return Array.from(allIds)
  }, [])

  // Helper to update batch caches using index
  const updateBatchCaches = useCallback(
    (userPlaceId: string, statusUpdate: EnrichmentStatusResponse) => {
      const affectedQueries = queryIndexRef.current.get(userPlaceId)
      if (affectedQueries) {
        for (const queryKey of affectedQueries) {
          queryClient.setQueryData<BatchEnrichmentStatusResponse>(
            queryKey,
            (old) => {
              if (!old) return old
              return { ...old, [userPlaceId]: statusUpdate }
            },
          )
        }
      }
    },
    [queryClient],
  )

  const setupWebSocket = useCallback(async () => {
    if (setupInProgressRef.current || socketRef.current?.connected) return

    setupInProgressRef.current = true

    try {
      setStatus('connecting')
      const token = await getTokenRef.current()

      if (!token) {
        console.error('[WS] No authentication token')
        setStatus('error')
        setupInProgressRef.current = false
        return
      }

      const socket: EnrichmentSocket = io(`${WS_ORIGIN}/enrichment`, {
        path: SOCKET_PATH,
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        timeout: 10000,
      })

      socketRef.current = socket

      socket.on('connect', () => {
        debugLog('[WS] Connected', { socketId: socket.id })
        setStatus('connected')
        setupInProgressRef.current = false

        const mergedSubs = getMergedSubscriptions()
        if (mergedSubs.length > 0) {
          socket.emit('batch-subscribe', mergedSubs)
        }
      })

      socket.on('batch-status-update', (data: BatchStatusUpdate) => {
        debugLog('[WS] Batch status update', {
          count: Object.keys(data).length,
        })

        // Build query index
        const userPlaceIds = Object.keys(data)
        const queryKey = [
          'batch-enrichment-status',
          ...userPlaceIds.sort(),
        ] as const

        for (const userPlaceId of userPlaceIds) {
          const existingSet = queryIndexRef.current.get(userPlaceId)
          if (existingSet) {
            existingSet.add(queryKey)
          } else {
            queryIndexRef.current.set(userPlaceId, new Set([queryKey]))
          }
        }

        // Update batch cache
        queryClient.setQueryData<BatchEnrichmentStatusResponse>(
          queryKey,
          (old) => ({
            ...old,
            ...data,
          }),
        )

        // Update individual caches
        for (const [userPlaceId, statusData] of Object.entries(data)) {
          queryClient.setQueryData<EnrichmentStatusResponse>(
            enrichmentStatusKeys.single(userPlaceId),
            statusData,
          )
        }
      })

      socket.on('company-status-update', async (data) => {
        // Sequence check - prevent out-of-order processing
        const lastSeq = lastSequenceRef.current.get(data.userPlaceId) ?? -1
        if (data.sequence <= lastSeq) {
          debugLog('[WS] Skipping out-of-order event', {
            userPlaceId: data.userPlaceId,
            receivedSeq: data.sequence,
            lastSeq,
          })
          return
        }
        lastSequenceRef.current.set(data.userPlaceId, data.sequence)

        debugLog('[WS] Status update', {
          userPlaceId: data.userPlaceId,
          status: data.status,
          progress: data.progress,
          sequence: data.sequence,
        })

        const statusUpdate: EnrichmentStatusResponse = {
          status: data.status,
          step: data.step,
          progress: data.progress,
          updatedAt: data.updatedAt,
          error: data.error,
          jobId: data.jobId,
        }

        // Update caches
        queryClient.setQueryData<EnrichmentStatusResponse>(
          enrichmentStatusKeys.single(data.userPlaceId),
          statusUpdate,
        )

        updateBatchCaches(data.userPlaceId, statusUpdate)

        // Handle completion
        if (data.status === 'completed' || data.status === 'failed') {
          const completionKey = `${data.userPlaceId}:${data.status}:${data.sequence}`
          if (processedCompletionsRef.current.get(completionKey)) {
            debugLog('[WS] Skipping duplicate completion', {
              userPlaceId: data.userPlaceId,
            })
            return
          }

          processedCompletionsRef.current.set(completionKey, {
            timestamp: data.updatedAt,
            status: data.status,
          })

          debugLog('[WS] Enrichment finished, updating data', {
            status: data.status,
            userPlaceId: data.userPlaceId,
          })

          // Invalidate user credits
          queryClient.invalidateQueries({ queryKey: userKeys.me() })

          try {
            const token = await getTokenRef.current()
            const placeData = await queryClient.fetchQuery<GetPlaceApiResponse>(
              {
                queryKey: placeKeys.place(data.userPlaceId),
                queryFn: async () =>
                  webApiClient.fetchWithAuth<GetPlaceApiResponse>(
                    `/places/${data.userPlaceId}`,
                    { method: 'GET' },
                    token,
                  ),
                staleTime: 0,
              },
            )

            if (!('error' in placeData)) {
              updateUserPlacesCaches(queryClient, (oldData) => {
                if (!oldData || 'error' in oldData) return oldData
                const placeIndex = oldData.items.findIndex(
                  (p) => p.id === data.userPlaceId,
                )
                if (placeIndex === -1) return oldData
                const newItems = [...oldData.items]
                newItems[placeIndex] = placeData.place
                return { ...oldData, items: newItems }
              })
            }

            queryClient.invalidateQueries({
              queryKey: placeEnrichmentKeys.place(data.userPlaceId),
            })
          } catch (error) {
            console.error('[WS] Failed to fetch updated place:', error)
            queryClient.invalidateQueries({ queryKey: userPlacesKeys.all })
          }

          // Clear sequence tracking for completed entity
          lastSequenceRef.current.delete(data.userPlaceId)
        }
      })

      socket.on('error', (error) => {
        if (error.code === 'FORBIDDEN' || error.code === 'NOT_FOUND') {
          console.warn(
            `[WS] Authorization error for ${error.userPlaceId}:`,
            error.message,
          )
          return
        }
        console.error('[WS] Connection error:', error)
        setStatus('error')
      })

      socket.on('disconnect', (reason) => {
        console.warn('[WS] Disconnected:', reason)
        setStatus('disconnected')
        setupInProgressRef.current = false

        if (reason === 'io server disconnect') {
          socket.connect()
        }
      })

      socket.io.on('reconnect_attempt', async (attempt) => {
        debugLog(`[WS] Reconnection attempt ${attempt}`)
        setStatus('connecting')

        try {
          const freshToken = await getTokenRef.current()
          if (freshToken && socket.auth && typeof socket.auth === 'object') {
            ;(socket.auth as { token: string }).token = freshToken
          }
        } catch (error) {
          console.error('[WS] Failed to refresh token:', error)
        }
      })

      socket.io.on('reconnect', () => {
        setStatus('connected')
        const mergedSubs = getMergedSubscriptions()
        if (mergedSubs.length > 0) {
          socket.emit('batch-subscribe', mergedSubs)
        }
      })

      socket.io.on('reconnect_failed', () => {
        console.error('[WS] Failed to reconnect')
        setStatus('error')
        setupInProgressRef.current = false
      })

      socket.on('connect_error', async (error) => {
        console.error('[WS] Connection error:', error.message)
        if (
          error.message.includes('Authentication') ||
          error.message.includes('token')
        ) {
          try {
            const freshToken = await getTokenRef.current()
            if (freshToken && socket.auth && typeof socket.auth === 'object') {
              ;(socket.auth as { token: string }).token = freshToken
            }
          } catch (tokenError) {
            console.error('[WS] Failed to refresh token:', tokenError)
          }
        }
      })
    } catch (error) {
      console.error('[WS] Failed to set up WebSocket:', error)
      setStatus('error')
      setupInProgressRef.current = false
    }
  }, [queryClient, getMergedSubscriptions, updateBatchCaches])

  useEffect(() => {
    setupWebSocket()

    // Token refresh every 45 minutes
    const tokenRefreshInterval = setInterval(
      async () => {
        if (socketRef.current?.connected) {
          try {
            const freshToken = await getTokenRef.current()
            if (
              freshToken &&
              socketRef.current.auth &&
              typeof socketRef.current.auth === 'object'
            ) {
              ;(socketRef.current.auth as { token: string }).token = freshToken
            }
          } catch (error) {
            console.error('[WS] Failed to refresh token:', error)
          }
        }
      },
      45 * 60 * 1000,
    )

    return () => {
      clearInterval(tokenRefreshInterval)
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      subscriptionsBySourceRef.current.clear()
      queryIndexRef.current.clear()
      lastSequenceRef.current.clear()
      processedCompletionsRef.current.clear()
      setupInProgressRef.current = false
      setStatus('disconnected')
    }
  }, [setupWebSocket])

  const emitMergedSubscriptionsImmediate = useCallback(() => {
    const mergedSubs = getMergedSubscriptions()
    debugLog('[WS] Emitting subscriptions:', mergedSubs.length)
    if (socketRef.current?.connected) {
      socketRef.current.emit('batch-subscribe', mergedSubs)
    }
  }, [getMergedSubscriptions])

  // Debounce subscription emissions by 50ms to batch rapid changes
  const emitMergedSubscriptions = useMemo(
    () => debounce(emitMergedSubscriptionsImmediate, 50),
    [emitMergedSubscriptionsImmediate],
  )

  const subscribe = useCallback(
    (sourceKey: string, userPlaceIds: string[]) => {
      const currentSourceIds = subscriptionsBySourceRef.current.get(sourceKey)
      const newIdsSet = new Set(userPlaceIds)

      const idsChanged =
        !currentSourceIds ||
        currentSourceIds.size !== newIdsSet.size ||
        !userPlaceIds.every((id) => currentSourceIds.has(id))

      if (!idsChanged) return

      subscriptionsBySourceRef.current.set(sourceKey, newIdsSet)
      emitMergedSubscriptions()
    },
    [emitMergedSubscriptions],
  )

  const unsubscribe = useCallback(
    (sourceKey: string) => {
      const removedIds = subscriptionsBySourceRef.current.get(sourceKey)
      if (!removedIds) return

      subscriptionsBySourceRef.current.delete(sourceKey)

      // Clean up query index
      for (const id of removedIds) {
        queryIndexRef.current.delete(id)
      }

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

export const useWebSocket = (): WebSocketContextValue => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider')
  }
  return context
}
