import type { ColumnDef } from '@tanstack/react-table'
import type { SearchResult } from '../Columns'
import { CellWrapper } from './CellWrapper'

export const nameColumn: ColumnDef<SearchResult> = {
  accessorKey: 'displayName',
  header: 'Name',
  cell: ({ row }) => {
    const value = row.getValue('displayName') as string
    return (
      <CellWrapper copyValue={value}>
        <a
          href={row.original.googleMapsUri}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {value}
        </a>
      </CellWrapper>
    )
  }
}
