import type { WebSocketStatus } from '@/contexts/WebSocketContext'
import type { EnrichmentStatusResponse } from '@api/routes_web/enrich/shared'

export type { WebSocketStatus }

interface UseContactEnrichmentWebSocketReturn {
  status: EnrichmentStatusResponse | null
  wsStatus: WebSocketStatus
  isConnected: boolean
}

/**
 * Contact WebSocket subscription is not implemented.
 * Use HTTP polling via useContactEnrichmentStatus instead.
 */
export const useContactEnrichmentWebSocket = (
  _contactId: string | null,
  _enabled = true,
): UseContactEnrichmentWebSocketReturn => {
  return {
    status: null,
    wsStatus: 'disconnected',
    isConnected: false,
  }
}
