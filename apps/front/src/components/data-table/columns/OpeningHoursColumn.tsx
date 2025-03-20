import { OpeningHoursContent } from '@/components/common/OpeningHours'
import { StatusIndicator } from '@/components/common/StatusIndicator'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatUtcOffset } from '@/lib/formatUtcOffset'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const openingHoursColumn: ColumnDef<SearchResult> = {
  id: 'openingHours',
  accessorKey: 'openingHours',
  size: 200,
  enableColumnFilter: false,
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Opening Hours" />
  ),
  cell: ({ row }) => {
    const openingHours = row.original.openingHours
    const utcOffsetMinutes = row.original.utcOffsetMinutes

    return (
      <ColumnPinCell
        id={row.original.id}
        content={
          openingHours ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-40 relative flex items-center justify-start pl-7"
                  title="Click to view full schedule"
                >
                  <div
                    className={cn(
                      'absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full',
                      openingHours.openNow ? 'bg-green-500' : 'bg-red-500',
                    )}
                  />
                  <span className="truncate">View opening hours</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="min-w-[350px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2 max-w-[88%]">
                    <span>{row.original.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusIndicator isOpen={openingHours.openNow} />
                      <span className="text-xs text-muted-foreground">
                        {formatUtcOffset(utcOffsetMinutes ?? 0)}
                      </span>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <OpeningHoursContent openingHours={openingHours} />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="secondary">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            ''
          )
        }
      />
    )
  },
}
