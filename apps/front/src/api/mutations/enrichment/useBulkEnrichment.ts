import { useApiMutation } from '@/hooks/useApi'
import type {
  BulkEnrichmentApiResponse,
  BulkEnrichmentRequestBody,
} from '@ritchy/types'

export const useBulkEnrichment = () => {
  return useApiMutation<BulkEnrichmentApiResponse, BulkEnrichmentRequestBody>(
    '/enrich/bulk',
    {
      method: 'POST',
    },
  )
}
