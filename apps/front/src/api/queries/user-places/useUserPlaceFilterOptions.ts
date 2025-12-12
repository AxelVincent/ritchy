import { useApiQuery } from '@/hooks/useApi'
import type {
  ContentFilters,
  GetUserPlaceFilterOptionsApiResponse,
} from '@ritchy/types'

export const userPlaceFilterOptionsKeys = {
  all: ['userPlaceFilterOptions'] as const,
  scoped: (params: { searchId?: string; filters?: ContentFilters }) =>
    [...userPlaceFilterOptionsKeys.all, params] as const,
}

export interface UseUserPlaceFilterOptionsOptions {
  searchId?: string
  filters?: ContentFilters
  enabled?: boolean
}

/**
 * Hook for fetching distinct filter options for user places.
 * Returns unique values for multi-select filter dropdowns.
 * listIds filtering is now part of filters.listIds.
 */
export const useUserPlaceFilterOptionsQuery = (
  options?: UseUserPlaceFilterOptionsOptions,
) => {
  const { searchId, filters, enabled = true } = options ?? {}

  // Build query string
  const searchParams = new URLSearchParams()
  if (searchId) searchParams.append('searchId', searchId)
  // Include listIds from filters for scoping filter options
  if (filters?.listIds?.length) {
    for (const id of filters.listIds) {
      searchParams.append('listIds', id)
    }
  }

  const queryString = searchParams.toString()
  const endpoint = `/user-places/filter-options${queryString ? `?${queryString}` : ''}`

  return useApiQuery<GetUserPlaceFilterOptionsApiResponse>(
    endpoint,
    userPlaceFilterOptionsKeys.scoped({ searchId, filters }),
    {
      enabled,
      // Filter options don't change frequently, cache for longer
      staleTime: 60000,
    },
  )
}
