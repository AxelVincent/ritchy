import { useEnrichmentStatus } from '@/api/queries/enrichment/useEnrichmentStatus'
import { EnrichmentActionButton } from '@/components/data-table/enrich/EnrichmentActionButton'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { TooltipTrigger } from '@/components/ui/tooltip'
import { useSelectionSafe } from '@/contexts/SelectionContext'
import { useTableSelectionContextSafe } from '@/contexts/TableSelectionContext'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { Maximize } from 'lucide-react'
import posthog from 'posthog-js'

// Cell content - not memoized because it uses hooks that subscribe to external state
const ActionCellContent = ({
  rowIndex,
  rowId,
  enrichedStatus,
  isSelected,
  onToggleSelected,
  onFocus,
}: {
  rowIndex: number
  rowId: string
  enrichedStatus?: 'ENRICHED' | 'RECENTLY_ENRICHED' | 'ENRICHMENT_ERROR'
  isSelected: boolean
  onToggleSelected: () => void
  onFocus: () => void
}) => {
  // Fetch individual enrichment status with WebSocket support
  const { data: liveStatus } = useEnrichmentStatus(rowId)

  return (
    <div className="w-full flex items-center justify-between gap-1 px-1">
      {/* Use CSS to toggle visibility */}
      <div className="w-6 flex items-center justify-center relative">
        {/* Checkbox - visible on group/row hover or when selected */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-opacity duration-75',
            isSelected
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 group-hover/row:opacity-100 pointer-events-none group-hover/row:pointer-events-auto',
          )}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelected}
            aria-label="Select row"
          />
        </div>
        {/* Row number - hidden on group/row hover when not selected */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center text-xs text-muted-foreground transition-opacity duration-75',
            isSelected
              ? 'opacity-0 pointer-events-none'
              : 'opacity-100 group-hover/row:opacity-0 pointer-events-auto group-hover/row:pointer-events-none',
          )}
        >
          {rowIndex + 1}
        </div>
      </div>

      {/* Rest stays the same */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7 p-0', 'hover:bg-accent')}
              onClick={onFocus}
              disabled={false}
            >
              <Maximize style={{ width: '14px', height: '14px' }} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Expand</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <EnrichmentActionButton
        userPlaceId={rowId}
        enrichedStatus={enrichedStatus}
        liveStatus={liveStatus}
      />
    </div>
  )
}

ActionCellContent.displayName = 'ActionCellContent'

// Header component that uses table selection context
const ActionColumnHeader = () => {
  const tableSelection = useTableSelectionContextSafe()

  if (!tableSelection) {
    // Fallback if no context (shouldn't happen in normal use)
    return (
      <div className="w-full h-full flex items-center justify-center left-2 relative">
        <Checkbox disabled aria-label="Select all" />
      </div>
    )
  }

  const { isAllSelected, isSomeSelected, selectAll, clearAll } = tableSelection

  return (
    <div className="w-full h-full flex items-center justify-center left-2 relative">
      <Checkbox
        checked={isAllSelected || (isSomeSelected && 'indeterminate')}
        onCheckedChange={(checked) => {
          if (checked) {
            selectAll()
          } else {
            clearAll()
          }
        }}
        aria-label="Select all"
      />
    </div>
  )
}

// Cell component that uses table selection context
const ActionColumnCell = ({
  row,
}: { row: { original: SearchResult; index: number } }) => {
  const selection = useSelectionSafe()
  const tableSelection = useTableSelectionContextSafe()

  const rowId = row.original.id
  const isSelected = tableSelection?.isSelected(rowId) ?? false

  const handleFocus = () => {
    posthog.capture('pin_cell_place', { property: 'action_column' })
    selection?.selectPlace(rowId)
  }

  const handleToggle = () => {
    tableSelection?.toggle(rowId)
  }

  return (
    <ActionCellContent
      rowIndex={row.index}
      rowId={rowId}
      enrichedStatus={row.original.enrichedStatus ?? undefined}
      isSelected={isSelected}
      onToggleSelected={handleToggle}
      onFocus={handleFocus}
    />
  )
}

export const actionColumn: ColumnDef<SearchResult> = {
  id: 'action',
  enableColumnFilter: false,
  size: 100,
  header: () => <ActionColumnHeader />,
  cell: ({ row }) => <ActionColumnCell row={row} />,
  enableSorting: false,
  enableHiding: false,
}
