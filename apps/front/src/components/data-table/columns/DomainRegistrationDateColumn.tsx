import { Card, CardContent } from '@/components/ui/card'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { HelpCircle } from 'lucide-react'
import React from 'react'
import { SimpleCell } from './utils/ColumnCells'
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
  function DomainRegistrationDateCell({ place }: { place: SearchResult }) {
    const domainRegistration = place.domainRegisteredAt

    // No website
    if (!place.website) {
      return (
        <SimpleCell>
          <span className="text-xs text-muted-foreground">No website</span>
        </SimpleCell>
      )
    }

    // No domain registration data
    if (!domainRegistration) {
      return (
        <SimpleCell>
          <span className="text-xs text-muted-foreground">
            No registration data
          </span>
        </SimpleCell>
      )
    }

    const formattedDate = formatRegistrationDate(
      new Date(String(domainRegistration)).toISOString(),
    )

    // Handle invalid date format
    if (!formattedDate) {
      return (
        <SimpleCell>
          <span className="text-xs text-muted-foreground">
            Invalid date format
          </span>
        </SimpleCell>
      )
    }

    return (
      <SimpleCell>
        <div className="flex items-center gap-1.5 text-sm w-full">
          <span className="truncate">{formattedDate}</span>
          <span className="truncate text-[11px] w-15 text-muted-foreground/75 whitespace-nowrap">
            {formatDistanceToNow(new Date(domainRegistration), {
              addSuffix: true,
            })}
          </span>
        </div>
      </SimpleCell>
    )
  },
)

// Column definition
export const domainRegistrationDateColumn: ColumnDef<SearchResult> = {
  id: 'domainRegistrationDate',
  accessorKey: 'enrichment',
  meta: {
    filterVariant: 'date-range',
    isEnrichment: true,
  },
  accessorFn: (row) => {
    return row.domainRegisteredAt
  },
  filterFn: (row, columnId, value: [Date | undefined, Date | undefined]) => {
    const [from, to] = value
    const date = row.getValue(columnId)
      ? new Date(row.getValue(columnId))
      : null

    // Only apply date filtering if we have a filter value
    if (!from && !to) return true

    // If we have filter dates but no cell value, exclude the row
    if (!date) return false

    // Now we know we have a valid cellValue and at least one filter date
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
    <HeaderWrapper
      column={column}
      title="Domain Registration Date"
      helper={
        <Card className="shadow-md">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle
                className="h-5 w-5 text-primary"
                aria-label="Calendar"
              />
              <div className="font-semibold text-base">
                About domain registration
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                  <span className="text-primary">1.</span>
                </div>
                <div>
                  Shows when a business first registered their website domain -
                  tracking their online presence
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                  <span className="text-primary">2.</span>
                </div>
                <div>
                  Helps identify established vs. newer businesses based on their
                  digital footprint
                </div>
              </div>
              <div className="mt-3 bg-muted/30 p-2.5 rounded-md flex items-start gap-2">
                <div className="flex-shrink-0">💡</div>
                <div className="text-sm">
                  Keep in mind: Some businesses create websites years after
                  opening, so this date might not reflect their actual age
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      }
    />
  ),
  cell: ({ row }) => <DomainRegistrationDateCell place={row.original} />,
}
