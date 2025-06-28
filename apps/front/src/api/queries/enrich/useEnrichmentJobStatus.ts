import { useApiQuery } from '@/hooks/useApi'
import type { EnrichmentJobStatusApiResponse } from '@ritchy/types'

const enrichmentJobStatusKeys = {
  all: ['enrichment', 'job-status'] as const,
  job: (jobId: string) => [...enrichmentJobStatusKeys.all, jobId] as const,
}

export const useEnrichmentJobStatus = (jobId: string, enabled = false) => {
  return useApiQuery<EnrichmentJobStatusApiResponse>(
    `/enrich/job/${jobId}/status`,
    enrichmentJobStatusKeys.job(jobId),
    {
      enabled,
      staleTime: 0, // Always fresh for polling
      retry: 3,
      refetchInterval: false, // We'll handle polling manually
    },
  )
}
