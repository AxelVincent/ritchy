import type { EnrichApiResponse } from '@ritchy/types/src/api/enrich.ts'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'

export const useEnrichWebsite = (
  website: string
): UseQueryResult<EnrichApiResponse> => {
  return useQuery({
    queryKey: ['enrich', 'website', website],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_WEB_BASE_URL}/enrich?website=${encodeURIComponent(
          website
        )}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to enrich website')
      }

      return response.json()
    },
    enabled: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false
  })
}
