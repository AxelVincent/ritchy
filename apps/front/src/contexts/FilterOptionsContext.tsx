import type { ListFilterOptions } from '@ritchy/types'
import { createContext, useContext } from 'react'

/**
 * Context for providing server-side filter options to DataTable columns.
 * In server-side pagination mode, filter options cannot be computed client-side
 * since only a page of data is available. This context provides the options
 * fetched from the server.
 */
export const FilterOptionsContext = createContext<ListFilterOptions | null>(
  null,
)

/**
 * Hook to access filter options from context.
 * Returns null if not in server-side mode (context not provided).
 */
export const useFilterOptionsContext = () => {
  return useContext(FilterOptionsContext)
}

/**
 * Map column IDs to their corresponding filter options key.
 * This maps the column's accessorKey/id to the key in ListFilterOptions.
 */
export const columnToFilterOptionsKey: Record<
  string,
  keyof ListFilterOptions | undefined
> = {
  status: 'status',
  primaryType: 'primaryType',
  types: 'types',
  country: 'country',
  locality: 'locality',
  postalCode: 'postalCode',
  source: 'source',
  workforceRange: 'workforceRange',
  priceLevel: 'priceLevel',
  technologies: 'technologies',
  lists: 'lists',
}

/**
 * Get filter options for a specific column from the context.
 */
export const getFilterOptionsForColumn = (
  filterOptions: ListFilterOptions | null,
  columnId: string,
): string[] | null => {
  if (!filterOptions) return null

  const key = columnToFilterOptionsKey[columnId]
  if (!key) return null

  return filterOptions[key] ?? null
}
