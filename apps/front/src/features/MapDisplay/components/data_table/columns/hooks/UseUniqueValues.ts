import type { SearchResult } from '@ritchy/types'
import type { Column } from '@tanstack/react-table'
import { useMemo } from 'react'
import type { FilterVariant } from '../types'

export const useUniqueValues = (
  column: Column<SearchResult>,
  filterVariant: FilterVariant,
) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: biome wrong warning
  return useMemo(() => {
    // Don't compute unique values for range or text filters
    if (filterVariant === 'range' || filterVariant === 'text') return []

    // Get currently selected values
    const selected = (column.getFilterValue() as string[]) || []

    // Get faceted unique values from the column
    const uniqueValues = Array.from(
      column.getFacetedUniqueValues().keys(),
    ).filter((value) => value !== undefined && value !== null && value !== '')

    // Combine and sort values
    return [...new Set([...uniqueValues, ...selected])]
      .sort((a, b) => String(a).localeCompare(String(b)))
      .slice(0, 5000)
  }, [column.getFacetedUniqueValues(), column.getFilterValue(), filterVariant])
}
