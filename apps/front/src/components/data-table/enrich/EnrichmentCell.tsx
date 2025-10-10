import { useEnrichmentStatus } from '@/api/queries/enrichment/useEnrichmentStatus'
import type { ReactNode } from 'react'
import { EnrichmentCellIndicator } from './EnrichmentCellIndicator'

interface EnrichmentCellProps {
  userPlaceId: string
  children: ReactNode
}

/**
 * Wrapper component for enrichment cells that automatically queries and displays
 * real-time enrichment status via WebSocket.
 *
 * Benefits:
 * - Each cell manages its own status query (shared cache)
 * - Automatic WebSocket subscription with self-correcting polling fallback
 * - Only re-renders when this specific cell's status changes
 * - No need for DataTable-level batch queries or active tracking
 */
export const EnrichmentCell = ({
  userPlaceId,
  children,
}: EnrichmentCellProps) => {
  // Query individual enrichment status (cached by TanStack Query)
  // WebSocket provides real-time updates, HTTP polling activates automatically if WebSocket fails
  const { data: status } = useEnrichmentStatus(userPlaceId)

  return (
    <EnrichmentCellIndicator status={status}>
      {children}
    </EnrichmentCellIndicator>
  )
}
