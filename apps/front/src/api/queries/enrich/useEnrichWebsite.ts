import { useApiQuery } from '@/hooks/useApi'
import type { EnrichApiResponse } from '@ritchy/types'

export const enrichKeys = {
  all: ['enrich'] as const,
  website: (id: string) => [...enrichKeys.all, 'website', id] as const,
}

export const useEnrichWebsite = (id: string, website: string) => {
  return useApiQuery<EnrichApiResponse>(
    `/enrich?id=${id}&website=${encodeURIComponent(website)}`,
    enrichKeys.website(id),
    {
      enabled: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
    },
  )
}
