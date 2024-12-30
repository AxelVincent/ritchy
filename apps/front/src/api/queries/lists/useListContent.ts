import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type { ListContentApiResponse } from '@ritchy/types'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useListContentQuery = (
  listId: string,
): UseQueryResult<ListContentApiResponse> => {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['listContent', listId],
    queryFn: async () => {
      const token = await getToken()
      const response = await apiClient.fetchWithAuth(
        `/lists/${listId}`,
        {
          method: 'GET',
        },
        token,
      )
      return response
    },
  })
}
