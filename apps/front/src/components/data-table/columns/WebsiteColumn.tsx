import { getCleanUrlDisplay } from '@/lib/utils/url-utils'
import type { SearchResult } from '@api/shared'
import type { ColumnDef } from '@tanstack/react-table'
import { ClickableCell } from './utils/ClickableCell'
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
