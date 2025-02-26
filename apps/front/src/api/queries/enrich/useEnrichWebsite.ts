import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type { EnrichApiResponse } from '@ritchy/types'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const enrichKeys = {
  all: ['enrich'] as const,
  website: (id: string) => [...enrichKeys.all, 'website', id] as const,
}

export const useEnrichWebsite = (
  id: string,
  website: string,
): UseQueryResult<EnrichApiResponse> => {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: enrichKeys.website(id),
    queryFn: async () => {
      const token = await getToken()
      return apiClient.fetchWithAuth(
        `/enrich?id=${id}&website=${encodeURIComponent(website)}`,
        undefined,
        token,
      )
    },
    // enabled: Boolean(website),
    enabled: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  })
}
