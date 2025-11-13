import { webApiClient } from '@/hooks/useApi'
import type { EnrichmentJobStatusApiResponse } from '@ritchy/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { userKeys } from '../users/useUserMe'

const enrichmentJobStatusKeys = {
  all: ['enrichment', 'job-status'] as const,
  job: (jobId: string) => [...enrichmentJobStatusKeys.all, jobId] as const,
}

export const useEnrichmentJobStatus = (
  jobId: string,
  enabled: boolean,
  pollingInterval: number,
) => {
  const queryClient = useQueryClient()
  const api = webApiClient.fetchWithAuth

  const result = useQuery<EnrichmentJobStatusApiResponse>({
    queryKey: enrichmentJobStatusKeys.job(jobId),
    queryFn: () => api(`/enrich/job/${jobId}/status`),
    staleTime: 0,
    refetchInterval: enabled ? pollingInterval : false,
    enabled,
  })

  queryClient.invalidateQueries({
    queryKey: userKeys.me(),
  })

  return result
}
