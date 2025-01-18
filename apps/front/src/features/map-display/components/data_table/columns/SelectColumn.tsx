import { Checkbox } from '@/components/ui/checkbox'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'

export const selectColumn: ColumnDef<SearchResult> = {
  id: 'select',
  enableColumnFilter: false,
  size: 5,
  header: ({ table }) => (
    <div className="flex items-center justify-center">
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    </div>
  ),
  cell: ({ row }) => (
    <div className="flex items-center justify-center">
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    </div>
  ),
  enableSorting: false,
  enableHiding: false,
}
