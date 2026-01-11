import { useApiQuery } from '@/hooks/useApi'
import type { EnrichmentStatusResponse } from '@api/routes_web/enrich/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { placeContactsKeys } from '../places/contacts/usePlaceContacts'
import { userKeys } from '../users/useUserMe'

/**
 * Query keys for contact enrichment status
 */
export const contactEnrichmentStatusKeys = {
  all: ['contact-enrichment-status'] as const,
  single: (contactId: string) =>
    [...contactEnrichmentStatusKeys.all, contactId] as const,
  batch: (contactIds: string[]) =>
    [
      ...contactEnrichmentStatusKeys.all,
      'batch',
      ...contactIds.sort(),
    ] as const,
}

/**
 * Hook to get real-time contact enrichment status
 *
 * Strategy:
 * 1. Poll when contact is actively processing/queued
 * 2. Trust cache for idle/completed states
 * 3. Self-correcting: stops polling when enrichment completes
 *
 * Note: WebSocket support for contact enrichment can be added later
 * using useContactEnrichmentWebSocket hook.
 *
 * @param contactId - The contact ID to get status for
 * @param enabled - Whether the query should be enabled (default: true)
 */
export const useContactEnrichmentStatus = (
  contactId: string,
  enabled = true,
) => {
  const queryClient = useQueryClient()
  const previousStatusRef = useRef<string | null>(null)

  const query = useApiQuery<EnrichmentStatusResponse>(
    `/enrich/contact/status/${contactId}`,
    contactEnrichmentStatusKeys.single(contactId),
    {
      enabled,

      refetchInterval: (query) => {
        // Stop polling when tab is hidden to save resources
        if (document.hidden) return false

        // Only poll if enrichment is actively processing
        const data = query.state.data
        if (!data || !['queued', 'processing'].includes(data.status)) {
          return false
        }

        // Poll every 2-3 seconds with jitter
        return 2000 + Math.random() * 1000
      },

      // Consider data stale after 30 seconds for idle/completed states
      staleTime: 30_000,

      // Use cached data if available to prevent flickering on mount
      initialData: () => {
        return queryClient.getQueryData<EnrichmentStatusResponse>(
          contactEnrichmentStatusKeys.single(contactId),
        )
      },
      initialDataUpdatedAt: () => {
        return queryClient.getQueryState(
          contactEnrichmentStatusKeys.single(contactId),
        )?.dataUpdatedAt
      },
    },
  )

  // Invalidate contacts query when enrichment completes or fails
  useEffect(() => {
    const currentStatus = query.data?.status
    const previousStatus = previousStatusRef.current

    // Detect transition to terminal state
    if (
      currentStatus &&
      (currentStatus === 'completed' || currentStatus === 'failed') &&
      previousStatus &&
      previousStatus !== 'completed' &&
      previousStatus !== 'failed'
    ) {
      // Invalidate contacts query to refetch updated contact data
      queryClient.invalidateQueries({ queryKey: placeContactsKeys.all })
      // Invalidate user credits
      queryClient.invalidateQueries({ queryKey: userKeys.me() })
    }

    previousStatusRef.current = currentStatus ?? null
  }, [query.data?.status, queryClient])

  return query
}
