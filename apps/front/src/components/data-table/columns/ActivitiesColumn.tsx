import { useMapStore } from '@/components/map-display/store/useMapStore'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { CopyButton } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const activitiesColumn: ColumnDef<SearchResult> = {
  id: 'activities',
  size: 250,
  accessorKey: 'companyActivities',
  meta: {
    filterVariant: 'text',
    isEnrichment: true,
  },
  accessorFn: (row) => {
    const activitiesSearchString =
      row.companyActivities
        ?.map((activity) => `${activity.name} ${activity.code}`)
        .join(', ') ?? ''
    return activitiesSearchString
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Activities" />,
  cell: ({ row }) => {
    const activities = row.original.companyActivities || []
    const { selectPlaceAndTab } = useMapStore()

    const handleCellClick = () => {
      // company is at root level, not under enrichment!
      selectPlaceAndTab(
        row.original.id,
        'company_details',
        'company.activities',
      )
    }

    if (!activities.length) {
      return (
        <div
          className="w-full h-full flex items-center px-2 cursor-pointer"
          onClick={handleCellClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleCellClick()
            }
          }}
        />
      )
    }

    const firstActivity = activities[0]
    const firstActivityName =
      firstActivity.name || firstActivity.code || 'Unknown'

    return (
      <div
        className="group/cell relative w-full h-full flex items-center px-2 gap-2 cursor-pointer"
        onClick={handleCellClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleCellClick()
          }
        }}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="truncate" title={firstActivityName}>
            {firstActivityName}
          </span>
          {activities.length > 1 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
              +{activities.length - 1}
            </span>
          )}
        </div>
        <CopyButton valueToCopy={firstActivityName} ariaLabel="Copy activity" />
      </div>
    )
  },
}
