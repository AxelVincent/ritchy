import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { CopyCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

export const workforceRangeColumn: ColumnDef<SearchResult> = {
  id: 'workforceRange',
  accessorKey: 'companyWorkforceRange',
  size: 150,
  enableSorting: true,
  meta: {
    filterVariant: 'text',
    isEnrichment: true,
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Workforce Range" />
  ),
  cell: ({ getValue }) => {
    const content = getValue() as string | null
    if (!content) return null
    return <CopyCell content={content} />
  },
}
