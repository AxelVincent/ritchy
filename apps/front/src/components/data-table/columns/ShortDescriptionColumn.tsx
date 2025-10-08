import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { createTextColumn } from './utils/createTextColumn'

export const shortDescriptionColumn: ColumnDef<SearchResult> = createTextColumn(
  {
    id: 'shortDescription',
    accessorKey: 'shortDescription',
    title: 'Short Description',
    filterVariant: 'text',
    isEnrichment: true,
  },
)
