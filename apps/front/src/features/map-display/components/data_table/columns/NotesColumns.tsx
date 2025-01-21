import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import React from 'react'
import { ColumnPinCopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const notesColumn: ColumnDef<SearchResult> = {
  id: 'notes',
  accessorKey: 'notes',
  size: 200,
  enableColumnFilter: false,
  header: ({ column }) => <HeaderWrapper column={column} title="Notes" />,
  cell: ({ row, table }) => {
    const place = row.original
    const [notes, setNotes] = React.useState(place.notes || [])

    React.useEffect(() => {
      setNotes(place.notes || [])
    }, [place.notes])

    const lastNote = notes.length > 0 ? notes[0] : null

    return (
      <ColumnPinCopyCell
        row={row}
        table={table}
        content={lastNote?.note ?? ''}
      />
    )
  },
}
