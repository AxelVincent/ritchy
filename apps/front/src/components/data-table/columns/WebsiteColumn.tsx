import { getCleanUrlDisplay } from '@/lib/utils/url-utils'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { CopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const websiteColumn: ColumnDef<SearchResult> = {
  id: 'website',
  accessorKey: 'website',
  size: 200,
  meta: {
    filterVariant: 'text',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Website" />,
  cell: ({ getValue }) => {
    const url = getValue() as string | null
    if (!url) return null
    return (
      <CopyCell content={url} href={url} formatDisplay={getCleanUrlDisplay} />
    )
  },
}
