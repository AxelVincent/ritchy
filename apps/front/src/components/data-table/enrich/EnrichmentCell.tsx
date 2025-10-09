import { useEnrichmentStatus } from '@/api/queries/enrichment/useEnrichmentStatus'
import type { ReactNode } from 'react'
import { EnrichmentCellIndicator } from './EnrichmentCellIndicator'

interface EnrichmentCellProps {
  userPlaceId: string
  isActive: boolean
  children: ReactNode
}

/**
 * Wrapper component for enrichment cells that automatically queries and displays
 * real-time enrichment status via WebSocket.
 *
 * Benefits:
 * - Each cell manages its own status query (shared cache)
 * - Automatic WebSocket subscription when active
 * - Only re-renders when this specific cell's status changes
 * - No need for DataTable-level batch queries
 */
export const EnrichmentCell = ({
  userPlaceId,
  isActive,
  children,
}: EnrichmentCellProps) => {
  // Query individual enrichment status (cached by TanStack Query)
  // WebSocket updates are automatically received via singleton context
  const { data: status } = useEnrichmentStatus(userPlaceId, isActive)

  return (
    <EnrichmentCellIndicator status={status}>
      {children}
    </EnrichmentCellIndicator>
  )
}
