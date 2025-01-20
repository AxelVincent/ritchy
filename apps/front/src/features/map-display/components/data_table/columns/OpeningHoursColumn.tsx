import { TextWrapper } from '@/components/common/TextWrapper'
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
import { OpeningHoursContent } from '../../shared/OpeningHours'
import { StatusIndicator } from '../../shared/StatusIndicator'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const openingHoursColumn: ColumnDef<SearchResult> = {
  id: 'regularOpeningHours',
  accessorKey: 'regularOpeningHours',
  size: 170,
  enableColumnFilter: false,
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Opening Hours" width="150px" />
  ),
  cell: ({ row }) => {
    const regularOpeningHours = row.original.regularOpeningHours
    const utcOffsetMinutes = row.original.utcOffsetMinutes

    if (!regularOpeningHours) {
      return <></>
    }

    return (
      <TextWrapper width="100%">
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
                  regularOpeningHours.openNow ? 'bg-green-500' : 'bg-red-500',
                )}
              />
              <span className="truncate">View opening hours</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="min-w-[350px]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 max-w-[88%]">
                <span>{row.original.displayName}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusIndicator isOpen={regularOpeningHours.openNow} />
                  <span className="text-xs text-muted-foreground">
                    {formatUtcOffset(utcOffsetMinutes ?? 0)}
                  </span>
                </div>
              </DialogTitle>
            </DialogHeader>
            <OpeningHoursContent regularOpeningHours={regularOpeningHours} />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TextWrapper>
    )
  },
}
