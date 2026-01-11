import { useApiQuery } from '@/hooks/useApi'
import type { GetUserPlacesApiResponse } from '@api/routes_web/user-places/get/contract'
import type { ContentFilters, PaginationParams } from '@api/shared'
import { buildQueryString } from '@api/shared'

export const userPlacesKeys = {
  all: ['userPlaces'] as const,
  filtered: (params: UserPlacesQueryParams) =>
    [...userPlacesKeys.all, params] as const,
}

export interface UserPlacesQueryParams {
  searchId?: string
  filters?: ContentFilters
  pagination?: Partial<PaginationParams>
}

export interface UseUserPlacesOptions {
  searchId?: string
  filters?: ContentFilters
  pagination?: Partial<PaginationParams>
  enabled?: boolean
}

/**
 * Unified hook for fetching user places.
 * Supports filtering by list, search, or fetching all user places.
 * listIds filtering is now part of filters.listIds.
 */
export const useUserPlacesQuery = (options?: UseUserPlacesOptions) => {
  const { searchId, filters, pagination, enabled = true } = options ?? {}

  // Build query string from all params (listIds is part of filters)
  const queryParams: Record<string, unknown> = {
    searchId,
    ...pagination,
    ...filters,
  }

  const queryString = buildQueryString(queryParams)
  const endpoint = `/user-places${queryString ? `?${queryString}` : ''}`

  const query = useApiQuery<GetUserPlacesApiResponse>(
    endpoint,
    userPlacesKeys.filtered({ searchId, filters, pagination }),
    {
      enabled,
      // Keep previous data while loading new page for smooth transitions
      placeholderData: (previousData) => previousData,
    },
  )

  // Extract data safely
  const responseData =
    query.data && !('error' in query.data) ? query.data : null
  const context = responseData?.context

  return {
    ...query,
    // Convenience accessors
    items: responseData?.items ?? [],
    pagination: responseData?.pagination,
    context,
    // List-specific accessors
    listId: context?.listId,
    listName: context?.listName,
    listEmoji: context?.listEmoji,
    listCreatedAt: context?.listCreatedAt,
    listUpdatedAt: context?.listUpdatedAt,
    // Search-specific accessors
    searchId: context?.searchId,
    searchKeyword: context?.searchKeyword,
    searchModel: context?.searchModel,
    searchCreatedAt: context?.searchCreatedAt,
  }
}
