import { useApiMutation } from '@/hooks/useApi'
import { isValidUUID } from '@/lib/validation'
import type { EnrichContactResponse } from '@api/routes_web/enrich/contact/contract'
import type { EnrichmentStatusResponse } from '@api/routes_web/enrich/shared'
import { useQueryClient } from '@tanstack/react-query'
import { contactEnrichmentStatusKeys } from '../../queries/enrichment/useContactEnrichmentStatus'

/**
 * Mutation hook for contact enrichment (Phase 2 of multi-worker architecture)
 *
 * Costs: 5 credits per contact
 * Enriches: LinkedIn profile, email addresses, phone numbers
 * Requires: Company enrichment must be completed first
 */
export const useContactEnrichment = () => {
  const queryClient = useQueryClient()

  return useApiMutation<EnrichContactResponse, { contactId: string }>(
    '/enrich/contact',
    {
      method: 'POST',
      getBody: (variables) => ({
        contactId: variables.contactId,
      }),
      onMutate: async (variables) => {
        // Validate UUID before processing
        if (!isValidUUID(variables.contactId)) {
          console.error(
            'Invalid UUID provided to contact enrichment mutation:',
            variables.contactId,
          )
          throw new Error('Invalid contact ID')
        }

        // Optimistically update contact status to 'queued'
        queryClient.setQueryData<EnrichmentStatusResponse>(
          contactEnrichmentStatusKeys.single(variables.contactId),
          {
            status: 'queued',
            step: 'Queued for contact enrichment',
            progress: 0,
            updatedAt: Date.now(),
          },
        )
      },
      onError: (_error, variables) => {
        // Reset contact status on error
        queryClient.setQueryData<EnrichmentStatusResponse>(
          contactEnrichmentStatusKeys.single(variables.contactId),
          {
            status: 'idle',
            step: '',
            progress: 0,
            updatedAt: Date.now(),
          },
        )
      },
      onSuccess: (_data, variables) => {
        // Confirm queued status
        queryClient.setQueryData<EnrichmentStatusResponse>(
          contactEnrichmentStatusKeys.single(variables.contactId),
          {
            status: 'queued',
            step: 'Queued for contact enrichment',
            progress: 0,
            updatedAt: Date.now(),
          },
        )

        // Invalidate credits query
        queryClient.invalidateQueries({ queryKey: ['userCredits'] })
      },
    },
  )
}
