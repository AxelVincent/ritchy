import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { useRef } from 'react'
import type { SearchResult } from '../Columns'
import { CellWrapper } from './CellWrapper'

export const nameColumn: ColumnDef<SearchResult> = {
  accessorKey: 'displayName',
  header: 'Name',
  cell: ({ row }) => {
    const textRef = useRef<HTMLDivElement>(null)
    const [isTruncated, setIsTruncated] = useState(false)
    useEffect(() => {
      const element = textRef.current
      if (element) {
        setIsTruncated(element.scrollWidth > element.clientWidth)
      }
    }, [])
    return (
      <CellWrapper>
        <div className="text-left max-w-[200px] group relative">
          <div
            ref={textRef}
            className="truncate"
            title={isTruncated ? row.original.displayName : undefined}
          >
            {row.original.displayName}
          </div>
          {isTruncated && (
            <div className="fixed mt-2 hidden rounded-md border bg-background p-2 shadow-md group-hover:flex group-hover:flex-wrap gap-2 max-h-[200px] overflow-y-auto z-[100] min-w-[200px]">
              {row.original.displayName}
            </div>
          )}
        </div>
      </CellWrapper>
    )
  }
}
