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
import { EmailsList } from './utils/EmailsList'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const emailsColumn: ColumnDef<SearchResult> = {
  id: 'emails',
  size: 300,
  accessorKey: 'emails',
  meta: {
    filterVariant: 'text',
    isEnrichment: true,
  },
  accessorFn: (row) => {
    const emailSearchString =
      row.emails?.map((email) => email.email).join(', ') ?? ''
    return emailSearchString
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Emails" />,
  cell: ({ row }) => {
    const emails = row.original.emails
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    if (!emails?.length) {
      return <ColumnPinCell id={row.original.id} content={null} />
    }

    if (emails.length === 1) {
      return <ContactEmailCell id={row.original.id} content={emails[0].email} />
    }

    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div
          className="flex items-center w-full pr-2 cursor-pointer min-h-[24px]"
          onClick={() => setIsDialogOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsDialogOpen(true)
            }
          }}
          aria-label="Open emails"
        >
          <div className="min-w-0 flex-1">
            <ContactEmailCell id={row.original.id} content={emails[0].email} />
          </div>
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap ml-1.5 flex-shrink-0">
            +{emails.length - 1} more
          </span>
        </div>
        <DialogContent className="max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{row.original.name}'s Emails</DialogTitle>
          </DialogHeader>
          <EmailsList emails={emails} id={row.original.id} />
        </DialogContent>
      </Dialog>
    )
  },
}
