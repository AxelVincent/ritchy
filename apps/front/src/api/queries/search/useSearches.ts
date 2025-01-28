import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type { GetSearchesResponse } from '@ritchy/types'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useSearchesQuery = (): UseQueryResult<GetSearchesResponse> => {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['searches'],
    queryFn: async () => {
      const token = await getToken()
      const response = await apiClient.fetchWithAuth(
        '/searches',
        {
          method: 'GET',
        },
        token,
      )
      return response
    },
  })
}
