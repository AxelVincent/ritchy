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
    const uniqueValues = new Set<string>()

    column.getFacetedUniqueValues().forEach((_, value) => {
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v !== undefined && v !== null && v !== '') {
            uniqueValues.add(String(v))
          }
        }
      } else if (value !== undefined && value !== null && value !== '') {
        uniqueValues.add(String(value))
      }
    })

    // Combine and sort values
    return [...new Set([...Array.from(uniqueValues), ...selected])]
      .sort((a, b) => String(a).localeCompare(String(b)))
      .slice(0, 5000)
  }, [column.getFacetedUniqueValues(), column.getFilterValue(), filterVariant])
}
