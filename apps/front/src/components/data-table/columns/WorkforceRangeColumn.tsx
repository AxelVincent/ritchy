import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ClickableCell } from './utils/ClickableCell'
import { CopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const workforceRangeColumn: ColumnDef<SearchResult> = {
  id: 'workforceRange',
  accessorKey: 'companyWorkforceRange',
  size: 150,
  enableSorting: true,
  meta: {
    filterVariant: 'multi-select',
    isEnrichment: true,
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Workforce Range" />
  ),
  cell: ({ getValue, row }) => {
    const content = getValue() as string | null

    return (
      <ClickableCell
        placeId={row.original.id}
        tab="company_details"
        className="p-0"
      >
        {content && <CopyCell content={content} />}
      </ClickableCell>
    )
  },
}
