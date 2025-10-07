import { activeEnrichmentsKeys } from '@/api/queries/enrichment/useActiveEnrichments'
import { enrichmentStatusKeys } from '@/api/queries/enrichment/useEnrichmentStatus'
import { useApiMutation } from '@/hooks/useApi'
import { isValidUUID } from '@/lib/validation'
import type {
  BatchEnrichmentStatusResponse,
  BulkEnrichmentApiResponse,
} from '@ritchy/types'
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

        // Get current active enrichments to determine the batch query key
        const activeEnrichments =
          queryClient.getQueryData<string[]>(activeEnrichmentsKeys.all) ?? []

        // Optimistic status data with proper typing
        const optimisticStatus = {
          status: 'queued' as const,
          step: 'Queued for enrichment',
          progress: 0,
          updatedAt: Date.now(),
        }

        // Store previous batch status for rollback (properly typed)
        const previousBatchStatus =
          queryClient.getQueryData<BatchEnrichmentStatusResponse>(
            enrichmentStatusKeys.batch(activeEnrichments),
          )

        // Optimistically update the batch query with proper typing
        queryClient.setQueryData<BatchEnrichmentStatusResponse>(
          enrichmentStatusKeys.batch(activeEnrichments),
          (old = {}) => ({
            ...old,
            [variables.userPlaceId]: optimisticStatus,
          }),
        )

        return { previousBatchStatus, activeEnrichments }
      },
      onError: (_error, variables, context) => {
        const typedContext = context as {
          activeEnrichments?: string[]
          previousBatchStatus?: BatchEnrichmentStatusResponse
        }

        // Rollback optimistic updates on error
        if (
          typedContext?.activeEnrichments &&
          typedContext?.previousBatchStatus
        ) {
          queryClient.setQueryData(
            enrichmentStatusKeys.batch(typedContext.activeEnrichments),
            typedContext.previousBatchStatus,
          )
        }

        // Remove from active enrichments
        queryClient.setQueryData<string[]>(
          activeEnrichmentsKeys.all,
          (old = []) => {
            return old.filter((id) => id !== variables.userPlaceId)
          },
        )
      },
      onSuccess: () => {
        // Invalidate batch status query to refetch latest
        queryClient.invalidateQueries({
          queryKey: enrichmentStatusKeys.all,
        })
      },
    },
  )
}
