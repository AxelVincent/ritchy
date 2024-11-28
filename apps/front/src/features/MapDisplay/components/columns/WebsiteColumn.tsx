import type { ColumnDef } from '@tanstack/react-table'
import { ExternalLink } from 'lucide-react'
import type { SearchResult } from '../Columns'
import { CellWrapper } from './CellWrapper'

export const websiteColumn: ColumnDef<SearchResult> = {
  accessorKey: 'website',
  header: () => <CellWrapper>Website</CellWrapper>,
  cell: ({ row }) => {
    const website = row.getValue('websiteUri') as string
    if (!website) return <CellWrapper>-</CellWrapper>

    return (
      <CellWrapper copyValue={website}>
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1"
        >
          <span className="truncate max-w-[200px]">{website}</span>
          <ExternalLink className="h-4 w-4" />
        </a>
      </CellWrapper>
    )
  }
}
