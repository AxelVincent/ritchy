import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ContactEmailCell } from './utils/ColumnCells'
import { ColumnPinCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const secondaryEmailsColumn: ColumnDef<SearchResult> = {
  id: 'secondaryEmails',
  size: 300,
  accessorFn: (row) => {
    const emails = row.secondaryEmails ?? []
    // Lenght is passed to DataTable to filter by amount of emails
    return emails.length
  },
  enableColumnFilter: true,
  meta: {
    filterVariant: 'range',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Secondary Emails" />
  ),
  cell: ({ row }) => {
    const emails = row.original.secondaryEmails

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
      <Dialog>
        <div
          className="group flex items-center w-full cursor-pointer min-h-[24px]"
          onClick={() => {
            const dialogTrigger = document.querySelector(
              `[data-secondary-emails-dialog-trigger="${row.original.id}"]`,
            ) as HTMLButtonElement
            dialogTrigger?.click()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              const dialogTrigger = document.querySelector(
                `[data-secondary-emails-dialog-trigger="${row.original.id}"]`,
              ) as HTMLButtonElement
              dialogTrigger?.click()
            }
          }}
          aria-label="Open secondary emails"
        >
          <ContactEmailCell id={row.original.id} content={emails[0]} />
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap ml-1.5 mr-1.5">
            +{emails.length - 1} more
          </span>
          <div className="flex-1" />
          <DialogTrigger asChild>
            <div
              data-secondary-emails-dialog-trigger={row.original.id}
              className="hidden"
            />
          </DialogTrigger>
        </div>
        <DialogContent className="max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{row.original.name}'s Secondary Emails</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {emails.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between border-b pb-2"
              >
                <ContactEmailCell id={row.original.id} content={email} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    )
  },
}
