import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type { Lists } from '@ritchy/types'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useListsQuery = (): UseQueryResult<Lists> => {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['lists'],
    queryFn: async () => {
      const token = await getToken()
      const response = await apiClient.fetchWithAuth(
        '/lists',
        {
          method: 'GET',
        },
        token,
      )
      return response
    },
  })
}
