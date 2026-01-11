import { getCleanUrlDisplay } from '@/lib/utils/url-utils'
import type { SearchResult } from '@api/shared'
import type { ColumnDef } from '@tanstack/react-table'
import { ClickableCell } from './utils/ClickableCell'
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
  cell: ({ getValue, row }) => {
    const url = getValue() as string | null

    return (
      <ClickableCell placeId={row.original.id} tab="details" className="p-0">
        {url && (
          <CopyCell
            content={url}
            href={url}
            formatDisplay={getCleanUrlDisplay}
          />
        )}
      </ClickableCell>
    )
  },
}
