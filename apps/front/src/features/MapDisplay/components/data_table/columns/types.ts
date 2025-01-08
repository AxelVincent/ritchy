import type { SearchResult } from '@ritchy/types'
import type { Column } from '@tanstack/react-table'

export type FilterVariant = 'range' | 'select' | 'multi-select' | 'text'

export interface FilterColumnMeta {
  filterVariant: FilterVariant
}

export interface FilterTypeProps {
  column: Column<SearchResult>
  sortedUniqueValues?: string[]
}
