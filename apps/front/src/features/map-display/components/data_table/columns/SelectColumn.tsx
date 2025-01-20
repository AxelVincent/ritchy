import { Checkbox } from '@/components/ui/checkbox'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'

export const selectColumn: ColumnDef<SearchResult> = {
  id: 'select',
  enableColumnFilter: false,
  size: 70,
  header: ({ table }) => (
    <div className="w-full flex items-center justify-between gap-3 p-2">
      <div className="w-5 text-sm text-muted-foreground text-left">ID</div>
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[1px]"
      />
    </div>
  ),
  cell: ({ row }) => (
    <div className="w-full flex items-center justify-between gap-3 p-2">
      <div className="w-5 text-sm text-muted-foreground text-left">
        {row.index + 1}
      </div>
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[1px]"
      />
    </div>
  ),
  enableSorting: false,
  enableHiding: false,
}
