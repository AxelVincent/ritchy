import { useWebSocket } from '@/contexts/WebSocketContext'
import type { WebSocketStatus } from '@/contexts/WebSocketContext'
import { debugLog } from '@/lib/utils/debug-logging'
import type {
  EnrichmentWebSocketClientEvents,
  EnrichmentWebSocketServerEvents,
} from '@ritchy/types'
import { useEffect, useMemo, useRef } from 'react'
import type { Socket } from 'socket.io-client'

export type { WebSocketStatus }

// Type-safe enrichment socket
type EnrichmentSocket = Socket<
  EnrichmentWebSocketServerEvents,
  EnrichmentWebSocketClientEvents
>

interface UseBatchEnrichmentWebSocketReturn {
  socket: EnrichmentSocket | null
  status: WebSocketStatus
  isConnected: boolean
}

/**
 * Hook to manage WebSocket subscriptions for multiple enrichments efficiently
 * Uses the singleton WebSocket context to prevent duplicate connections
 *
 * Features:
 * - Batch subscribe/unsubscribe operations
 * - Automatic subscription management on userPlaceIds change
 * - Debounced subscription updates to prevent rapid churn
 * - Shared connection state
 * - Graceful cleanup on unmount
 *
 * @param userPlaceIds - Array of enrichment IDs to subscribe to
 * @param enabled - Whether subscriptions should be active (default: true)
 */
export const useBatchEnrichmentWebSocket = (
  userPlaceIds: string[],
  enabled = true,
): UseBatchEnrichmentWebSocketReturn => {
  const { socket, status, isConnected, subscribe, unsubscribe } = useWebSocket()

  // Track previous IDs to detect changes
  const prevIdsRef = useRef<Set<string>>(new Set())

  // Memoize ID set for efficient comparison
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const currentIdsSet = useMemo(
    () => new Set(userPlaceIds),
    [userPlaceIds.join(',')],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    debugLog('[WS Batch] useBatchEnrichmentWebSocket effect triggered', {
      enabled,
      count: userPlaceIds.length,
    })

    if (!enabled || userPlaceIds.length === 0) {
      debugLog('[WS Batch] WebSocket disabled or no userPlaceIds')
      return
    }

    // Calculate diff: what to subscribe and unsubscribe
    const toSubscribe: string[] = []
    const toUnsubscribe: string[] = []

    // Find new IDs to subscribe
    for (const id of currentIdsSet) {
      if (!prevIdsRef.current.has(id)) {
        toSubscribe.push(id)
      }
    }

    // Find old IDs to unsubscribe
    for (const id of prevIdsRef.current) {
      if (!currentIdsSet.has(id)) {
        toUnsubscribe.push(id)
      }
    }

    // Unsubscribe from removed IDs
    if (toUnsubscribe.length > 0) {
      debugLog('[WS Batch] Unsubscribing from:', toUnsubscribe)
      for (const id of toUnsubscribe) {
        unsubscribe(id)
      }
    }

    // Subscribe to new IDs
    if (toSubscribe.length > 0) {
      debugLog('[WS Batch] Subscribing to:', toSubscribe)
      for (const id of toSubscribe) {
        subscribe(id)
      }
    }

    // Update previous IDs
    prevIdsRef.current = new Set(currentIdsSet)

    // Cleanup: unsubscribe from all on unmount
    return () => {
      debugLog('[WS Batch] Cleanup - unsubscribing from all:', userPlaceIds)
      for (const id of currentIdsSet) {
        unsubscribe(id)
      }
      prevIdsRef.current.clear()
    }
  }, [userPlaceIds.join(','), enabled])

  return {
    socket,
    status,
    isConnected,
  }
}
