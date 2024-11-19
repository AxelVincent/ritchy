import type {
  PlacesSearchRequestBody,
  PlacesSearchResponse
} from '@ritchy/types/src/api/places.ts'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'

export const useTextSearch = ({
  textQuery,
  resultsQuantity,
  locationBias
}: PlacesSearchRequestBody): UseQueryResult<PlacesSearchResponse> => {
  return useQuery({
    queryKey: [
      'places',
      'text-search',
      textQuery,
      resultsQuantity,
      locationBias
    ],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_WEB_BASE_URL}/places/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            textQuery,
            resultsQuantity,
            locationBias
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch places')
      }

      return response.json()
    },
    enabled: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false
  })
}
