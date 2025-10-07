import { EnrichmentActionButton } from '@/components/data-table/enrich/EnrichmentActionButton'
import { useMapStore } from '@/components/map-display/store/useMapStore'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { EnrichmentStatusResponse, SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { MapPinned, Sparkles } from 'lucide-react'
import posthog from 'posthog-js'
import { memo, useState } from 'react'

// Memoized cell content to prevent re-renders when batchStatus object reference changes
const ActionCellContent = memo(
  ({
    rowIndex,
    rowId,
    enrichedStatus,
    liveStatus,
    isSelected,
    onToggleSelected,
    onFocus,
  }: {
    rowIndex: number
    rowId: string
    enrichedStatus?: 'ENRICHED' | 'RECENTLY_ENRICHED' | 'ENRICHMENT_ERROR'
    liveStatus?: EnrichmentStatusResponse
    isSelected: boolean
    onToggleSelected: (value: boolean) => void
    onFocus: () => void
  }) => {
    const [isHovered, setIsHovered] = useState(false)

    return (
      <div 
        className="w-full flex items-center justify-between gap-1 px-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Row number or checkbox on hover */}
        <div className="w-6 flex items-center justify-center">
          {isHovered || isSelected ? (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(value) => onToggleSelected(!!value)}
              aria-label="Select row"
            />
          ) : (
            <div className="text-xs text-muted-foreground">
              {rowIndex + 1}
            </div>
          )}
        </div>

        {/* Focus button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onFocus}
          aria-label="Focus row"
        >
          <MapPinned className="h-4 w-4 text-muted-foreground" />
        </Button>

        {/* Enrichment button */}
        <EnrichmentActionButton
          userPlaceId={rowId}
          enrichedStatus={enrichedStatus}
          liveStatus={liveStatus}
        />
      </div>
    )
  },
  (prev, next) => {
    // Prevent re-render if nothing actually changed
    return (
      prev.rowIndex === next.rowIndex &&
      prev.rowId === next.rowId &&
      prev.enrichedStatus === next.enrichedStatus &&
      prev.isSelected === next.isSelected &&
      prev.liveStatus?.status === next.liveStatus?.status &&
      prev.liveStatus?.progress === next.liveStatus?.progress &&
      prev.liveStatus?.step === next.liveStatus?.step &&
      prev.liveStatus?.error === next.liveStatus?.error
    )
  },
)

ActionCellContent.displayName = 'ActionCellContent'

export const actionColumn: ColumnDef<SearchResult> = {
  id: 'action',
  enableColumnFilter: false,
  size: 100,
  header: ({ table }) => (
    <div className="w-full flex flex-row items-center justify-between gap-1 px-1">
            <div className="flex items-center justify-center">
            <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
      </div>
      <div className="h-6 w-6 flex items-center justify-center">
        <MapPinned className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="h-6 w-6 flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
      </div>

    </div>
  ),
  cell: ({ row, table }) => {
    const batchStatus = table.options.meta?.batchStatus
    const liveStatus = batchStatus?.[row.original.id]
    const { selectedPlaceId, setSelectedPlaceId } = useMapStore()

    const handleFocus = () => {
      posthog.capture('pin_cell_place', { property: 'action_column' })
      setSelectedPlaceId(row.original.id)
    }

    return (
      <ActionCellContent
        rowIndex={row.index}
        rowId={row.original.id}
        enrichedStatus={row.original.enrichedStatus ?? undefined}
        liveStatus={liveStatus}
        isSelected={row.getIsSelected()}
        onToggleSelected={(value) => row.toggleSelected(value)}
        onFocus={handleFocus}
      />
    )
  },
  enableSorting: false,
  enableHiding: false,
}
