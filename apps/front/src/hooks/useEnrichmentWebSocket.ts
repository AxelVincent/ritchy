import { useWebSocket } from '@/contexts/WebSocketContext'
import type { WebSocketStatus } from '@/contexts/WebSocketContext'
import { debugLog } from '@/lib/utils/debug-logging'
import type {
  EnrichmentWebSocketClientEvents,
  EnrichmentWebSocketServerEvents,
} from '@ritchy/types'
import { useEffect } from 'react'
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
 * Uses the singleton WebSocket context to prevent duplicate connections
 *
 * Features:
 * - Automatic subscription/unsubscription
 * - Shared connection state
 * - No duplicate connections
 * - Graceful cleanup on unmount
 *
 * @param userPlaceId - The ID of the enrichment to subscribe to
 * @param enabled - Whether the subscription should be active (default: true)
 */
export const useEnrichmentWebSocket = (
  userPlaceId: string,
  enabled = true,
): UseEnrichmentWebSocketReturn => {
  const { socket, status, isConnected, subscribe, unsubscribe } = useWebSocket()

  useEffect(() => {
    debugLog('[WS Single] useEnrichmentWebSocket effect triggered', {
      enabled,
      userPlaceId,
    })

    if (!enabled || !userPlaceId) {
      debugLog('[WS Single] WebSocket disabled or no userPlaceId')
      return
    }

    // Subscribe to this enrichment
    subscribe(userPlaceId)

    // Cleanup: unsubscribe on unmount or when userPlaceId changes
    return () => {
      debugLog('[WS Single] Unsubscribing from:', userPlaceId)
      unsubscribe(userPlaceId)
    }
  }, [userPlaceId, enabled, subscribe, unsubscribe])

  return {
    socket,
    status,
    isConnected,
  }
}
