import { activeEnrichmentsKeys } from '@/api/queries/enrichment/useActiveEnrichments'
import { enrichmentStatusKeys } from '@/api/queries/enrichment/useEnrichmentStatus'
import { useApiMutation } from '@/hooks/useApi'
import { validateUUIDs } from '@/lib/validation'
import type {
  BulkEnrichmentApiResponse,
  BulkEnrichmentRequestBody,
  EnrichmentStatusResponse,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useBulkEnrichment = () => {
  const queryClient = useQueryClient()

  return useApiMutation<BulkEnrichmentApiResponse, BulkEnrichmentRequestBody>(
    '/enrich/bulk',
    {
      method: 'POST',
      onMutate: async (variables) => {
        // Validate UUIDs before processing
        const validIds = validateUUIDs(variables.userPlaceIds)
        if (validIds.length === 0) {
          console.error('No valid UUIDs provided to bulk enrichment mutation')
          throw new Error('No valid user place IDs provided')
        }

        // Cancel any outgoing refetches to prevent race conditions
        await queryClient.cancelQueries({ queryKey: enrichmentStatusKeys.all })

        // Add to active enrichments via query cache (single source of truth)
        queryClient.setQueryData<string[]>(
          activeEnrichmentsKeys.all,
          (old = []) => {
            return Array.from(new Set([...old, ...validIds]))
          },
        )
      },
      onError: (_, variables) => {
        // Remove from active enrichments on error
        queryClient.setQueryData<string[]>(
          activeEnrichmentsKeys.all,
          (old = []) => {
            return old.filter((id) => !variables.userPlaceIds.includes(id))
          },
        )
      },
      onSuccess: (_data, variables) => {
        // Set each status to queued immediately (don't wait for backend)
        for (const userPlaceId of variables.userPlaceIds) {
          queryClient.setQueryData<EnrichmentStatusResponse>(
            enrichmentStatusKeys.single(userPlaceId),
            {
              status: 'queued',
              step: 'Queued for enrichment',
              progress: 0,
              updatedAt: Date.now(),
            },
          )
        }

        // No invalidation needed - WebSocket will push all updates in real-time
        // including queued → processing → completed transitions
      },
    },
  )
}
