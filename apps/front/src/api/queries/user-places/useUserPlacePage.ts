import { useApiQuery } from '@/hooks/useApi'
import type {
  ContentFilters,
  GetUserPlacePageApiResponse,
  PaginationParams,
} from '@ritchy/types'
import { buildQueryString } from '@ritchy/types'

export const userPlacePageKeys = {
  all: ['userPlacePage'] as const,
  item: (
    itemId: string,
    params: {
      listId?: string
      searchId?: string
      filters?: ContentFilters
      pagination?: Partial<PaginationParams>
    },
  ) => [...userPlacePageKeys.all, itemId, params] as const,
}

export interface UseUserPlacePageOptions {
  itemId: string
  listId?: string
  searchId?: string
  filters?: ContentFilters
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  enabled?: boolean
}

/**
 * Hook for finding the page number containing a specific item.
 * Used when clicking a map marker to navigate to the correct page.
 */
export const useUserPlacePageQuery = (options: UseUserPlacePageOptions) => {
  const {
    itemId,
    listId,
    searchId,
    filters,
    pageSize,
    sortBy,
    sortOrder,
    enabled = true,
  } = options

  const queryParams: Record<string, unknown> = {
    listId,
    searchId,
    pageSize,
    sortBy,
    sortOrder,
    ...filters,
  }

  const queryString = buildQueryString(queryParams)
  const endpoint = `/user-places/items/${itemId}/page${queryString ? `?${queryString}` : ''}`

  return useApiQuery<GetUserPlacePageApiResponse>(
    endpoint,
    userPlacePageKeys.item(itemId, {
      listId,
      searchId,
      filters,
      pagination: { pageSize },
    }),
    {
      enabled: enabled && !!itemId,
    },
  )
}
