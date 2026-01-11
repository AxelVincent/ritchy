import { useWebSocket } from '@/contexts/WebSocketContext'
import type { WebSocketStatus } from '@/contexts/WebSocketContext'
import { debugLog } from '@/lib/utils/debug-logging'
import type {
  EnrichmentWebSocketClientEvents,
  EnrichmentWebSocketServerEvents,
} from '@api/shared'
import { useEffect, useId } from 'react'
import type { Socket } from 'socket.io-client'

export type { WebSocketStatus }

// Type-safe enrichment socket
type EnrichmentSocket = Socket<
  EnrichmentWebSocketServerEvents,
  EnrichmentWebSocketClientEvents
>

interface UseEnrichmentWebSocketReturn {
  socket: EnrichmentSocket | null
  status: WebSocketStatus
  isConnected: boolean
}

/**
 * Hook to manage WebSocket subscription for a single enrichment
 *
 * v2 Architecture:
 * - Uses source-based subscription merging
 * - Can be used alongside useBatchEnrichmentWebSocket without conflicts
 * - Cleanup on unmount removes this component's subscription
 *
 * Use case: Place detail page where only one enrichment needs monitoring
 *
 * @param userPlaceId - The ID of the enrichment to subscribe to
 * @param enabled - Whether the subscription should be active (default: true)
 */
export const useEnrichmentWebSocket = (
  userPlaceId: string,
  enabled = true,
): UseEnrichmentWebSocketReturn => {
  const { socket, status, isConnected, subscribe, unsubscribe } = useWebSocket()

  // Generate a unique source key for this hook instance
  const sourceKey = useId()

  useEffect(() => {
    if (!enabled || !userPlaceId) {
      debugLog('[WS Single] Subscription disabled or no userPlaceId')
      unsubscribe(sourceKey)
      return
    }

    debugLog('[WS Single] Subscribing to:', userPlaceId)
    subscribe(sourceKey, [userPlaceId])

    // Cleanup on unmount - remove this source's subscription
    return () => {
      debugLog('[WS Single] Cleanup - unsubscribing source:', sourceKey)
      unsubscribe(sourceKey)
    }
  }, [userPlaceId, enabled, subscribe, unsubscribe, sourceKey])

  return {
    socket,
    status,
    isConnected,
  }
}
