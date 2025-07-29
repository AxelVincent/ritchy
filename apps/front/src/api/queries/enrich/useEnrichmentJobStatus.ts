import type { EnrichmentJobStatusApiResponse } from '@ritchy/types'
import { useQuery } from '@tanstack/react-query'

const enrichmentJobStatusKeys = {
  all: ['enrichment', 'job-status'] as const,
  job: (jobId: string) => [...enrichmentJobStatusKeys.all, jobId] as const,
}

export const useEnrichmentJobStatus = (jobId: string, enabled = false) => {
  return useQuery<EnrichmentJobStatusApiResponse>({
    queryKey: enrichmentJobStatusKeys.job(jobId),
    queryFn: async () => {
      const response = await fetch(`/api/web/enrich/job/${jobId}/status`)
      return response.json()
    },
    enabled,
    staleTime: 0,
    refetchInterval: false,
  })
}
