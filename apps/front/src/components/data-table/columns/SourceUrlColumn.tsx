import { getCleanUrlDisplay } from '@/lib/utils/url-utils'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { CopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const sourceUrlColumn: ColumnDef<SearchResult> = {
  id: 'sourceUrl',
  accessorKey: 'sourceUrl',
  size: 200,
  meta: {
    filterVariant: 'text',
    defaultVisible: false,
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Source URL" />,
  cell: ({ getValue }) => {
    const url = getValue() as string | null
    if (!url) return null
    return (
      <CopyCell content={url} href={url} formatDisplay={getCleanUrlDisplay} />
    )
  },
}
