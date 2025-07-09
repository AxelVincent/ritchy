import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCell, ContactEmailCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const primaryEmailColumn: ColumnDef<SearchResult> = {
  id: 'primaryEmail',
  accessorKey: 'primaryEmail',
  size: 200,
  meta: {
    filterVariant: 'text',
  },
  header: () => <HeaderWrapper title="Primary Email" />,
  cell: ({ row }) => {
    const primaryEmail = row.original.primaryEmail

    return primaryEmail ? (
      <ContactEmailCell id={row.original.id} content={primaryEmail} />
    ) : (
      <ColumnPinCell
        id={row.original.id}
        content={
          <span className="text-muted-foreground text-sm">
            No primary email
          </span>
        }
      />
    )
  },
}
