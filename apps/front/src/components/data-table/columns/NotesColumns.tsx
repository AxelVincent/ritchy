import { useMapStore } from '@/components/map-display/store/useMapStore'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinNoteCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const notesColumn: ColumnDef<SearchResult> = {
  id: 'notes',
  accessorKey: 'notes',
  meta: {
    filterVariant: 'date-range',
  },
  accessorFn: (row) => {
    const date = row.notes?.[0]?.createdAt
      ? new Date(row.notes?.[0]?.createdAt)
      : null

    return date
  },
  filterFn: (row, columnId, value: [Date | undefined, Date | undefined]) => {
    const [from, to] = value
    const cellValue = row.getValue(columnId) as Date | null

    // Only apply date filtering if we have a filter value
    if (!from && !to) return true

    // If we have filter dates but no cell value, exclude the row
    if (!cellValue) return false

    // Now we know we have a valid cellValue and at least one filter date
    if (from && to) {
      return cellValue >= from && cellValue <= to
    }
    if (from) {
      return cellValue >= from
    }
    if (to) {
      return cellValue <= to
    }
    return true
  },
  size: 200,
  header: ({ column }) => <HeaderWrapper column={column} title="Notes" />,
  cell: ({ row }) => {
    const place = row.original
    const { selectPlaceAndTab } = useMapStore()

    const handleClick = () => {
      selectPlaceAndTab(row.original.id, 'notes')
    }

    return (
      <ColumnPinNoteCell
        id={row.original.id}
        place={place}
        content={place.notes?.[0] || null}
        onClick={handleClick}
      />
    )
  },
}
