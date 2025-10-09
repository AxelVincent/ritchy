import { useEnrichmentStatus } from '@/api/queries/enrichment/useEnrichmentStatus'
import { EnrichmentActionButton } from '@/components/data-table/enrich/EnrichmentActionButton'
import { useMapStore } from '@/components/map-display/store/useMapStore'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { TooltipTrigger } from '@/components/ui/tooltip'
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
  onToggleSelected: (value: boolean) => void
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
            onCheckedChange={(value) => onToggleSelected(!!value)}
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

export const actionColumn: ColumnDef<SearchResult> = {
  id: 'action',
  enableColumnFilter: false,
  size: 100,
  header: ({ table }) => (
    <div className="w-full relative min-h-[85px]">
      <div className="absolute bottom-0 left-2">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value: boolean) =>
            table.toggleAllPageRowsSelected(!!value)
          }
          aria-label="Select all"
        />
      </div>
    </div>
  ),
  cell: ({ row }) => {
    const { setSelectedPlaceId } = useMapStore()

    const handleFocus = () => {
      posthog.capture('pin_cell_place', { property: 'action_column' })
      setSelectedPlaceId(row.original.id)
    }

    return (
      <ActionCellContent
        rowIndex={row.index}
        rowId={row.original.id}
        enrichedStatus={row.original.enrichedStatus ?? undefined}
        isSelected={row.getIsSelected()}
        onToggleSelected={(value) => row.toggleSelected(value)}
        onFocus={handleFocus}
      />
    )
  },
  enableSorting: false,
  enableHiding: false,
}
