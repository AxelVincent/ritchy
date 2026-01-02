import { useWebSocket } from '@/contexts/WebSocketContext'
import type { WebSocketStatus } from '@/contexts/WebSocketContext'
import { debugLog } from '@/lib/utils/debug-logging'
import type {
  EnrichmentWebSocketClientEvents,
  EnrichmentWebSocketServerEvents,
} from '@ritchy/types'
import { useEffect, useId, useRef } from 'react'
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
 * Hook to manage WebSocket subscriptions for page data
 *
 * v2 Architecture:
 * - Uses source-based subscription merging
 * - Multiple components can subscribe independently
 * - Cleanup on unmount removes this component's subscriptions
 * - Subscribes once on page load, not on every scroll
 *
 * @param userPlaceIds - Array of userPlace IDs to subscribe to (current page)
 * @param enabled - Whether subscriptions should be active (default: true)
 */
export const useBatchEnrichmentWebSocket = (
  userPlaceIds: string[],
  enabled = true,
): UseBatchEnrichmentWebSocketReturn => {
  const { socket, status, isConnected, subscribe, unsubscribe } = useWebSocket()

  // Generate a unique source key for this hook instance
  const sourceKey = useId()

  // Track last subscribed IDs to prevent re-subscribing on every render
  const lastSubscribedIdsRef = useRef<string | null>(null)
  // Keep refs to latest callbacks to avoid dependency on their identity
  const subscribeRef = useRef(subscribe)
  const unsubscribeRef = useRef(unsubscribe)

  // Update refs when callbacks change
  subscribeRef.current = subscribe
  unsubscribeRef.current = unsubscribe

  // Create stable ID string for comparison
  const idsKey = userPlaceIds.join(',')

  useEffect(() => {
    if (!enabled) {
      if (lastSubscribedIdsRef.current !== null) {
        debugLog('[WS Batch] Subscriptions disabled')
        unsubscribeRef.current(sourceKey)
        lastSubscribedIdsRef.current = null
      }
      return
    }

    // Only subscribe if IDs actually changed
    if (lastSubscribedIdsRef.current === idsKey) {
      return
    }

    debugLog('[WS Batch] Subscribing to:', userPlaceIds.length, 'places')
    subscribeRef.current(sourceKey, userPlaceIds)
    lastSubscribedIdsRef.current = idsKey

    // Cleanup on unmount - remove this source's subscriptions
    return () => {
      debugLog('[WS Batch] Cleanup - unsubscribing source:', sourceKey)
      unsubscribeRef.current(sourceKey)
      lastSubscribedIdsRef.current = null
    }
  }, [idsKey, enabled, sourceKey, userPlaceIds])

  return {
    socket,
    status,
    isConnected,
  }
}
