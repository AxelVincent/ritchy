import { useApiMutation } from '@/hooks/useApi'
import type {
  BatchEnrichmentRequestBody,
  BatchEnrichmentResponseApiResponse,
} from '@ritchy/types'

export const useBatchEnrichment = () => {
  return useApiMutation<
    BatchEnrichmentResponseApiResponse,
    BatchEnrichmentRequestBody
  >('/enrich/batch', {
    method: 'POST',
  })
}
