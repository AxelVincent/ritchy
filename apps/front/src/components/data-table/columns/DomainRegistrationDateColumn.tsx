import { Card, CardContent } from '@/components/ui/card'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow, parseISO } from 'date-fns'
import React from 'react'
import { ColumnPinCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

const formatRegistrationDate = (registrationDate: string): string | null => {
  try {
    const date = parseISO(registrationDate)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return null
  }
}

// Cell component for domain registration date
const DomainRegistrationDateCell = React.memo(
  function DomainRegistrationDateCell({
    id,
    place,
  }: { id: string; place: SearchResult }) {
    const domainRegistration = place.domainRegisteredAt

    // No website
    if (!place.website) {
      return (
        <ColumnPinCell
          id={id}
          content={
            <span className="text-xs text-muted-foreground">No website</span>
          }
        />
      )
    }

    // No domain registration data
    if (!domainRegistration) {
      return (
        <ColumnPinCell
          id={id}
          content={
            <span className="text-xs text-muted-foreground">
              No registration data
            </span>
          }
        />
      )
    }

    const formattedDate = formatRegistrationDate(
      new Date(String(domainRegistration)).toISOString(),
    )

    // Handle invalid date format
    if (!formattedDate) {
      return (
        <ColumnPinCell
          id={id}
          content={
            <span className="text-xs text-muted-foreground">
              Invalid date format
            </span>
          }
        />
      )
    }

    return (
      <ColumnPinCell
        id={id}
        content={
          <div className="flex items-center gap-1.5 text-sm w-full">
            <span className="truncate">{formattedDate}</span>
            <span className="truncate text-[11px] w-15 text-muted-foreground/75 whitespace-nowrap">
              {formatDistanceToNow(new Date(domainRegistration), {
                addSuffix: true,
              })}
            </span>
          </div>
        }
      />
    )
  },
)

// Column definition
export const domainRegistrationDateColumn: ColumnDef<SearchResult> = {
  id: 'domainRegistrationDate',
  accessorKey: 'enrichment',
  meta: {
    filterVariant: 'date-range',
  },
  accessorFn: (row) => {
    return row.domainRegisteredAt
  },
  filterFn: (row, columnId, value: [Date | undefined, Date | undefined]) => {
    const [from, to] = value
    const cellValue = row.getValue(columnId) as Date | null

    // Only apply date filtering if we have a filter value
    if (!from && !to) return true

    // If we have filter dates but no cell value, exclude the row
    if (!cellValue) return false

    // Now we know we have a valid cellValue and at least one filter date
    if (from && to) {
      return cellValue >= from && cellValue <= to
    }
    if (from) {
      return cellValue >= from
    }
    if (to) {
      return cellValue <= to
    }
    return true
  },
  size: 180,
  header: ({ column }) => (
    <HeaderWrapper
      column={column}
      title="Domain Registration Date"
      helper={
        <Card className="shadow-md">
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="font-medium">What does this mean?</div>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <span className="font-semibold">Domain registration date</span>{' '}
                is when the website was first purchased. This can help you spot
                newly opened businesses.
              </li>
              <li>
                <span className="font-semibold text-foreground">
                  But it's not always exact:
                </span>{' '}
                some businesses change names or get a website long after
                opening.
              </li>
            </ul>
          </CardContent>
        </Card>
      }
    />
  ),
  cell: ({ row }) => (
    <DomainRegistrationDateCell id={row.original.id} place={row.original} />
  ),
}
