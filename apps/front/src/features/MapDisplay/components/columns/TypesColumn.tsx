import { Badge } from '@/components/ui/badge'
import type { ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'
import type { SearchResult } from '../Columns'
import { CellWrapper } from './CellWrapper'

export const typesColumn: ColumnDef<SearchResult> = {
  accessorKey: 'types',
  header: 'Types',
  cell: ({ row }) => {
    const types = row.original.types
    const displayCount = 2
    const remainingCount = types.length - displayCount
    const [isOpen, setIsOpen] = useState(false)

    return (
      <CellWrapper>
        <div className="flex gap-2 whitespace-nowrap">
          {types.slice(0, displayCount).map((type) => (
            <Badge variant="secondary" key={type} className="shrink-0">
              {type}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <div className="relative shrink-0">
              <Badge
                variant="outline"
                className="cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
              >
                +{remainingCount}
              </Badge>

              {isOpen && (
                <div className="fixed mt-2 rounded-md border bg-background p-2 shadow-md flex flex-wrap gap-2 max-h-[200px] overflow-y-auto z-[100] min-w-[200px]">
                  {types.slice(displayCount).map((type) => (
                    <Badge variant="secondary" key={type}>
                      {type}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CellWrapper>
    )
  }
}
