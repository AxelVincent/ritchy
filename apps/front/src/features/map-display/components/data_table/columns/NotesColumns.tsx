import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinNoteCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const notesColumn: ColumnDef<SearchResult> = {
  id: 'notes',
  accessorKey: 'notes',
  size: 200,
  enableColumnFilter: false,
  header: ({ column }) => <HeaderWrapper column={column} title="Notes" />,
  cell: ({ row, table }) => {
    const place = row.original
    return (
      <ColumnPinNoteCell
        row={row}
        table={table}
        place={place}
        content={place.notes?.[0] || null}
      />
    )
  },
}
