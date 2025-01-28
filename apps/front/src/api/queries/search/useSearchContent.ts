import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type { GetSearchContentApiResponse } from '@ritchy/types'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useSearchContentQuery = (
  searchId: string,
): UseQueryResult<GetSearchContentApiResponse> => {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['searchContent', searchId],
    queryFn: async () => {
      const token = await getToken()
      const response = await apiClient.fetchWithAuth(
        `/searches/${searchId}`,
        {
          method: 'GET',
        },
        token,
      )
      return response
    },
  })
}
