import { Badge } from '@/components/ui/badge'
import type { ColumnDef } from '@tanstack/react-table'
import type { SearchResult } from '../Columns'
import { CellWrapper } from './CellWrapper'

export const typesColumn: ColumnDef<SearchResult> = {
  accessorKey: 'types',
  header: 'Types',
  cell: ({ row }) => {
    const types = row.original.types
    const displayCount = 2
    const remainingCount = types.length - displayCount

    return (
      <CellWrapper>
        <div className="flex gap-2 whitespace-nowrap">
          {types.slice(0, displayCount).map((type) => (
            <Badge variant="secondary" key={type} className="shrink-0">
              {type}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <div className="relative group shrink-0">
              <Badge variant="outline">+{remainingCount}</Badge>

              <div className="fixed mt-2 hidden rounded-md border bg-background p-2 shadow-md group-hover:flex group-hover:flex-wrap gap-2 max-h-[200px] overflow-y-auto z-[100] min-w-[200px]">
                {types.slice(displayCount).map((type) => (
                  <Badge variant="secondary" key={type}>
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CellWrapper>
    )
  }
}
