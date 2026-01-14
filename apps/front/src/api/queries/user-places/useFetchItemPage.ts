import { webApiClient } from '@/hooks/useApi'
import type { GetUserPlacePageApiResponse } from '@api/routes_web/user-places/get-item-page/contract'
import type { ContentFilters } from '@api/shared'
import { buildQueryString } from '@api/shared'
import { useAuth } from '@clerk/clerk-react'
import { useCallback } from 'react'

interface FetchItemPageOptions {
  searchId?: string
  filters?: ContentFilters
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Hook that returns a function to fetch which page a specific item is on.
 * Used for navigating to a marker that's not on the current page.
 */
export const useFetchUserPlaceItemPage = () => {
  const { getToken } = useAuth()

  return useCallback(
    async (
      itemId: string,
      options?: FetchItemPageOptions,
    ): Promise<GetUserPlacePageApiResponse | null> => {
      const { searchId, filters, pageSize, sortBy, sortOrder } = options ?? {}

      // listIds is now part of filters
      const queryParams: Record<string, unknown> = {
        searchId,
        pageSize,
        sortBy,
        sortOrder,
        ...filters,
      }

      const queryString = buildQueryString(queryParams)
      const endpoint = `/user-places/items/${itemId}/page${queryString ? `?${queryString}` : ''}`

      try {
        const token = await getToken()
        const response =
          await webApiClient.fetchWithAuth<GetUserPlacePageApiResponse>(
            endpoint,
            { method: 'GET' },
            token,
          )
        return response
      } catch (error) {
        console.error('Failed to fetch item page:', error)
        return null
      }
    },
    [getToken],
  )
}
