import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'
import { ContactEmailCell } from './utils/ColumnCells'
import { ColumnPinCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'
import { SecondaryEmailsList } from './utils/SecondaryEmailsList'

export const secondaryEmailsColumn: ColumnDef<SearchResult> = {
  id: 'secondaryEmails',
  size: 300,
  accessorFn: (row) => {
    const emails = row.secondaryEmails ?? []
    // Length is passed to DataTable to filter by amount of emails
    return emails.length
  },
  enableColumnFilter: true,
  meta: {
    filterVariant: 'range',
  },
  header: () => <HeaderWrapper title="Secondary Emails" />,
  cell: ({ row }) => {
    const emails = row.original.secondaryEmails
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    if (!emails?.length) {
      return (
        <ColumnPinCell
          id={row.original.id}
          content={
            <span className="text-muted-foreground text-sm">
              No secondary emails
            </span>
          }
        />
      )
    }

    if (emails.length === 1) {
      return <ContactEmailCell id={row.original.id} content={emails[0]} />
    }

    // Multiple emails: show first email + badge with count
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div
          className="group flex items-center w-full min-h-[24px]"
          onClick={() => setIsDialogOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsDialogOpen(true)
            }
          }}
          aria-label="Open secondary emails"
        >
          <ContactEmailCell id={row.original.id} content={emails[0]} />
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap ml-1.5 mr-1.5">
            +{emails.length - 1} more
          </span>
          <div className="flex-1" />
        </div>
        <DialogContent className="max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{row.original.name}'s Secondary Emails</DialogTitle>
          </DialogHeader>
          <SecondaryEmailsList emails={emails} id={row.original.id} />
        </DialogContent>
      </Dialog>
    )
  },
}
