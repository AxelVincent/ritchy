import type { SearchResult } from '@api/shared'
import type { ColumnDef } from '@tanstack/react-table'
import { createTextColumn } from './utils/createTextColumn'

export const sourceIdColumn: ColumnDef<SearchResult> = createTextColumn({
  id: 'sourceId',
  accessorKey: 'sourceId',
  title: 'Source ID',
  size: 150,
  filterVariant: 'text',
  defaultVisible: false,
})
