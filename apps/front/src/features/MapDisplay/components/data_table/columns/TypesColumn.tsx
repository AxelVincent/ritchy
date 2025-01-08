import { TextWrapper } from '@/components/common/TextWrapper'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const typesColumn: ColumnDef<SearchResult> = {
  id: 'types',
  accessorKey: 'types',
  enableColumnFilter: true,
  meta: {
    filterVariant: 'multi-select',
  },
  filterFn: (row, id, filterValue: string[]) => {
    if (!filterValue?.length) return true
    const rowTypes = row.getValue(id) as string[]
    return filterValue.some((filter) => rowTypes.includes(filter))
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Types" width="350px" />
  ),
  cell: ({ row }) => {
    const types = row.original.types
    const displayCount = 2
    const remainingCount = types.length - displayCount

    return (
      <TextWrapper width="350px">
        <div className="flex flex-row gap-2">
          {types.slice(0, displayCount).map((type) => (
            <Badge variant="secondary" key={type} className="shrink-0">
              {type}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <div
                  className="cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  onKeyUp={(e) => e.stopPropagation()}
                >
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
      </TextWrapper>
    )
  },
}
