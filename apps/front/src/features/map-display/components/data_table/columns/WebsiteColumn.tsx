import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

const getDomainFromUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain
  } catch {
    return url
  }
}

export const websiteColumn: ColumnDef<SearchResult> = {
  id: 'websiteUri',
  accessorKey: 'websiteUri',
  size: 200,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Website" />,
  cell: ({ row, table }) => {
    const website = row.getValue('websiteUri') as string
    return (
      <ColumnPinCopyCell
        row={row}
        table={table}
        content={website ? getDomainFromUrl(website) : ''}
      />
    )
  },
}
