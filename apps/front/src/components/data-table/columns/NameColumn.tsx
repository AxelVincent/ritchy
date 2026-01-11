import type { SearchResult } from '@api/shared'
import type { ColumnDef } from '@tanstack/react-table'
import { createTextColumn } from './utils/createTextColumn'

export const nameColumn: ColumnDef<SearchResult> = createTextColumn({
  id: 'name',
  accessorKey: 'name',
  title: 'Name',
  size: 200,
  filterVariant: 'text',
})
