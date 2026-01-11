import { useApiMutation } from '@/hooks/useApi'
import type {
  BulkEnrichmentApiResponse,
  BulkEnrichmentRequest,
} from '@api/routes_web/enrich/bulk/contract'

export const useBatchEnrichment = () => {
  return useApiMutation<BulkEnrichmentApiResponse, BulkEnrichmentRequest>(
    '/enrich/batch',
    {
      method: 'POST',
    },
  )
}
