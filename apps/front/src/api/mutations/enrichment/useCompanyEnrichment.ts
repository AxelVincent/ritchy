import { activeEnrichmentsKeys } from '@/api/queries/enrichment/useActiveEnrichments'
import { enrichmentStatusKeys } from '@/api/queries/enrichment/useEnrichmentStatus'
import { useApiMutation } from '@/hooks/useApi'
import { isValidUUID } from '@/lib/validation'
import type { EnrichmentStatusResponse } from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

interface CompanyEnrichmentResponse {
  success: boolean
  message: string
  enrichmentId?: string
  alreadyEnriched?: boolean
  credits: number
}

/**
 * Mutation hook for company enrichment (Phase 1 of multi-worker architecture)
 *
 * Costs: 1 credit
 * Enriches: Website, governmental data, WHOIS, company description, creates contacts from officers
 * Does NOT enrich: Individual officer contact details (LinkedIn, email, phone)
 */
export const useCompanyEnrichment = () => {
  const queryClient = useQueryClient()

  return useApiMutation<CompanyEnrichmentResponse, { userPlaceId: string }>(
    '/enrich/company',
    {
      method: 'POST',
      getBody: (variables) => ({
        userPlaceId: variables.userPlaceId,
      }),
      onMutate: async (variables) => {
        // Validate UUID before processing
        if (!isValidUUID(variables.userPlaceId)) {
          console.error(
            'Invalid UUID provided to company enrichment mutation:',
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
        // Set the status to queued immediately (don't wait for backend)
        queryClient.setQueryData<EnrichmentStatusResponse>(
          enrichmentStatusKeys.single(variables.userPlaceId),
          {
            status: 'queued',
            step: 'Queued for company enrichment',
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
