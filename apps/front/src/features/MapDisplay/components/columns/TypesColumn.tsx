import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { ColumnDef } from '@tanstack/react-table'
import type { SearchResult } from '../Columns'
import { CellWrapper } from './CellWrapper'

export const typesColumn: ColumnDef<SearchResult> = {
  id: 'types',
  accessorKey: 'types',
  header: () => <CellWrapper>Types</CellWrapper>,
  cell: ({ row }) => {
    const types = row.original.types
    const displayCount = 2
    const remainingCount = types.length - displayCount

    return (
      <CellWrapper>
        <div className="flex flex-row gap-2">
          {types.slice(0, displayCount).map((type) => (
            <Badge variant="secondary" key={type} className="shrink-0">
              {type}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <div className="cursor-pointer">
                  <Badge variant="outline">+ {remainingCount}</Badge>
                </div>
              </PopoverTrigger>
              <PopoverContent>
                <div className="flex flex-row gap-2 flex-wrap">
                  {types.slice(displayCount).map((type) => (
                    <Badge variant="secondary" key={type}>
                      {type}
                    </Badge>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CellWrapper>
    )
  },
}
