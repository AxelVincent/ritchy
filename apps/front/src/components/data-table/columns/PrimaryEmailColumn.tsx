import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCell, PrimaryEmailCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const primaryEmailColumn: ColumnDef<SearchResult> = {
  id: 'primaryEmail',
  accessorKey: 'primaryEmail',
  size: 200,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Primary Email" />
  ),
  cell: ({ row }) => {
    const primaryEmail = row.original.primaryEmail

    return primaryEmail ? (
      <PrimaryEmailCell id={row.original.id} content={primaryEmail} />
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
