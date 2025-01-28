import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type { PlacesSearchRequestBody, Search } from '@ritchy/types'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})
// TODO - TO REMOVE
export const useTextSearch = ({
  textQuery,
  locationBias,
  model,
}: PlacesSearchRequestBody): UseQueryResult<Search> => {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['places', 'text-search', textQuery, locationBias, model],
    queryFn: async () => {
      const token = await getToken()
      const response = await apiClient.fetchWithAuth(
        '/places/search',
        {
          method: 'POST',
          body: JSON.stringify({
            textQuery,
            locationBias,
            model,
          }),
        },
        token,
      )

      return response
    },
    enabled: false,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })
}
