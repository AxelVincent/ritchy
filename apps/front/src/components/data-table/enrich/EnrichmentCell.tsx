import type { EnrichmentStatusData } from '@api/shared'
import type { ReactNode } from 'react'
import { EnrichmentCellIndicator } from './EnrichmentCellIndicator'

interface EnrichmentCellProps {
  userPlaceId: string
  status: EnrichmentStatusData | undefined
  children: ReactNode
}

/**
 * Wrapper component for enrichment cells that displays enrichment status.
 *
 * Performance optimized:
 * - No individual queries per cell (uses batch status from parent)
 * - No WebSocket subscriptions per cell (managed at DataTable level)
 * - Only re-renders when status prop changes
 * - Supports virtualized lists with thousands of rows
 */
export const EnrichmentCell = ({
  userPlaceId: _userPlaceId,
  status,
  children,
}: EnrichmentCellProps) => {
  return (
    <EnrichmentCellIndicator status={status}>
      {children}
    </EnrichmentCellIndicator>
  )
}
