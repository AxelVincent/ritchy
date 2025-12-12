import { useWebSocket } from '@/contexts/WebSocketContext'
import type { WebSocketStatus } from '@/contexts/WebSocketContext'
import { debugLog } from '@/lib/utils/debug-logging'
import type {
  EnrichmentWebSocketClientEvents,
  EnrichmentWebSocketServerEvents,
} from '@ritchy/types'
import { useEffect, useId } from 'react'
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: using join for stable comparison
  useEffect(() => {
    if (!enabled) {
      debugLog('[WS Batch] Subscriptions disabled')
      unsubscribe(sourceKey)
      return
    }

    debugLog('[WS Batch] Subscribing to:', userPlaceIds.length, 'places')
    subscribe(sourceKey, userPlaceIds)

    // Cleanup on unmount - remove this source's subscriptions
    return () => {
      debugLog('[WS Batch] Cleanup - unsubscribing source:', sourceKey)
      unsubscribe(sourceKey)
    }
  }, [userPlaceIds.join(','), enabled, subscribe, unsubscribe, sourceKey])

  return {
    socket,
    status,
    isConnected,
  }
}
