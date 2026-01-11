import { useApiQuery } from '@/hooks/useApi'
import type { GetUserPlaceMarkersApiResponse } from '@api/routes_web/user-places/markers/contract'
import type { ContentFilters } from '@api/shared'
import { buildQueryString } from '@api/shared'

export const userPlaceMarkersKeys = {
  all: ['userPlaceMarkers'] as const,
  filtered: (params: UserPlaceMarkersQueryParams) =>
    [...userPlaceMarkersKeys.all, params] as const,
}

export interface UserPlaceMarkersQueryParams {
  searchId?: string
  filters?: ContentFilters
}

export interface UseUserPlaceMarkersOptions {
  searchId?: string
  filters?: ContentFilters
  enabled?: boolean
}

/**
 * Hook for fetching lightweight marker data for map display.
 * Returns only id, name, emoji, and location for each place.
 * listIds filtering is now part of filters.listIds.
 */
export const useUserPlaceMarkersQuery = (
  options?: UseUserPlaceMarkersOptions,
) => {
  const { searchId, filters, enabled = true } = options ?? {}

  const queryParams: Record<string, unknown> = {
    searchId,
    ...filters,
  }

  const queryString = buildQueryString(queryParams)
  const endpoint = `/user-places/markers${queryString ? `?${queryString}` : ''}`

  return useApiQuery<GetUserPlaceMarkersApiResponse>(
    endpoint,
    userPlaceMarkersKeys.filtered({ searchId, filters }),
    {
      enabled,
      // Cache markers for longer since they don't change as often
      staleTime: 30000,
    },
  )
}
