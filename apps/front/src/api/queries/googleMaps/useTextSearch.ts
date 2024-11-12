import type { TextSearchResponse } from '@ritchy/types/src/places.js'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'

interface UseTextSearchOptions {
  query: string
  pageSize: number
  location: {
    latitude: number
    longitude: number
    radiusInMeters: number
  }
}

export const useTextSearch = ({
  query,
  pageSize = 20,
  location
}: UseTextSearchOptions): UseQueryResult<TextSearchResponse> => {
  return useQuery({
    queryKey: ['places', 'text-search', query, pageSize, location],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_WEB_BASE_URL}/places/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            textQuery: query,
            pageSize,
            ...(location && {
              locationBias: {
                circle: {
                  center: {
                    latitude: location.latitude,
                    longitude: location.longitude
                  },
                  radiusInMeters: location.radiusInMeters ?? 500
                }
              }
            })
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch places')
      }

      return response.json()
    },
    enabled: false,
    staleTime: 1000 * 60 * 5,
    retry: false
  })
}
