import { Badge } from '@/components/ui/badge'
import type { SearchResult } from '@api/shared'
import type { ColumnDef } from '@tanstack/react-table'
import { ClickableCell } from './utils/ClickableCell'
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

    if (!activities.length) {
      return (
        <ClickableCell placeId={row.original.id} tab="company_details">
          {null}
        </ClickableCell>
      )
    }

    const firstActivity = activities[0]
    const firstActivityName =
      firstActivity.name || firstActivity.code || 'Unknown'

    return (
      <ClickableCell
        placeId={row.original.id}
        tab="company_details"
        className="group/cell relative gap-2"
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="truncate" title={firstActivityName}>
            {firstActivityName}
          </span>
          {activities.length > 1 && (
            <Badge variant="secondary">+{activities.length - 1}</Badge>
          )}
        </div>
        <CopyButton valueToCopy={firstActivityName} ariaLabel="Copy activity" />
      </ClickableCell>
    )
  },
}
