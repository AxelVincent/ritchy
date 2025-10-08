import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { createTextColumn } from './utils/createTextColumn'

export const sourceColumn: ColumnDef<SearchResult> = createTextColumn({
  id: 'source',
  accessorKey: 'source',
  title: 'Source',
  size: 120,
  filterVariant: 'multi-select',
})
