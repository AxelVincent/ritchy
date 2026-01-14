import { activeEnrichmentsKeys } from '@/api/queries/enrichment/useActiveEnrichments'
import { enrichmentStatusKeys } from '@/api/queries/enrichment/useEnrichmentStatus'
import { useApiMutation } from '@/hooks/useApi'
import { isValidUUID } from '@/lib/validation'
import type { BulkEnrichmentApiResponse } from '@api/routes_web/enrich/bulk/contract'
import type { EnrichmentStatusResponse } from '@api/routes_web/enrich/shared'
import { useQueryClient } from '@tanstack/react-query'

export const useSingleEnrichment = () => {
  const queryClient = useQueryClient()

  return useApiMutation<BulkEnrichmentApiResponse, { userPlaceId: string }>(
    '/enrich/bulk',
    {
      method: 'POST',
      getBody: (variables) => ({
        userPlaceIds: [variables.userPlaceId],
      }),
      onMutate: async (variables) => {
        // Validate UUID before processing
        if (!isValidUUID(variables.userPlaceId)) {
          console.error(
            'Invalid UUID provided to enrichment mutation:',
            variables.userPlaceId,
          )
          throw new Error('Invalid user place ID')
        }

        // Cancel any outgoing refetches to prevent race conditions
        await queryClient.cancelQueries({ queryKey: enrichmentStatusKeys.all })

        // Add to active enrichments via query cache (single source of truth)
        queryClient.setQueryData<string[]>(
          activeEnrichmentsKeys.all,
          (old = []) => {
            return Array.from(new Set([...old, variables.userPlaceId]))
          },
        )
      },
      onError: (_error, variables) => {
        // Remove from active enrichments on error
        queryClient.setQueryData<string[]>(
          activeEnrichmentsKeys.all,
          (old = []) => {
            return old.filter((id) => id !== variables.userPlaceId)
          },
        )
      },
      onSuccess: (_data, variables) => {
        // Set the single status to queued immediately (don't wait for backend)
        queryClient.setQueryData<EnrichmentStatusResponse>(
          enrichmentStatusKeys.single(variables.userPlaceId),
          {
            status: 'queued',
            step: 'Queued for enrichment',
            progress: 0,
            updatedAt: Date.now(),
          },
        )

        // No invalidation needed - WebSocket will push all updates in real-time
        // including queued → processing → completed transitions
      },
    },
  )
}
