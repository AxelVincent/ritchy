import type { SearchResult } from '@api/shared'
import type { ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import React from 'react'
import { ClickableCell } from './utils/ClickableCell'
import { HeaderWrapper } from './utils/HeaderWrapper'

const formatInteractionDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const LastInteractionAtCell = React.memo(function LastInteractionAtCell({
  date,
}: {
  date: Date | string
}) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const formattedDate = formatInteractionDate(dateObj)

  return (
    <div className="flex items-center gap-1.5 text-sm w-full">
      <span className="truncate">{formattedDate}</span>
      <span className="truncate text-[11px] text-muted-foreground/75 whitespace-nowrap">
        {formatDistanceToNow(dateObj, { addSuffix: true })}
      </span>
    </div>
  )
})

export const lastInteractionAtColumn: ColumnDef<SearchResult> = {
  id: 'lastInteractionAt',
  accessorKey: 'lastInteractionAt',
  meta: {
    filterVariant: 'date-range',
  },
  accessorFn: (row) => {
    return row.lastInteractionAt
  },
  filterFn: (row, columnId, value: [Date | undefined, Date | undefined]) => {
    const [from, to] = value
    const cellValue = row.getValue(columnId) as Date | string | null
    const date = cellValue ? new Date(cellValue) : null

    if (!from && !to) return true
    if (!date) return false

    if (from && to) {
      return date >= from && date <= to
    }
    if (from) {
      return date >= from
    }
    if (to) {
      return date <= to
    }
    return true
  },
  size: 180,
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Last Interaction" />
  ),
  cell: ({ getValue, row }) => {
    const dateValue = getValue()

    return (
      <ClickableCell placeId={row.original.id} tab="details">
        {dateValue ? (
          <LastInteractionAtCell date={dateValue as Date | string} />
        ) : null}
      </ClickableCell>
    )
  },
}
