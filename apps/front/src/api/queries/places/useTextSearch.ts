import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type {
  PlacesSearchRequestBody,
  PlacesSearchResponse,
} from '@ritchy/types'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useTextSearch = ({
  textQuery,
  resultsQuantity,
  locationBias,
}: PlacesSearchRequestBody): UseQueryResult<PlacesSearchResponse> => {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: [
      'places',
      'text-search',
      textQuery,
      resultsQuantity,
      locationBias,
    ],
    queryFn: async () => {
      const token = await getToken()
      const response = await apiClient.fetchWithAuth(
        '/places/search',
        {
          method: 'POST',
          body: JSON.stringify({
            textQuery,
            resultsQuantity,
            locationBias,
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
