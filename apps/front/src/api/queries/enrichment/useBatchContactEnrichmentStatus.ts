import { useApiQuery } from '@/hooks/useApi'
import type { EnrichmentStatusResponse } from '@ritchy/types'
import { contactEnrichmentStatusKeys } from './useContactEnrichmentStatus'

type BatchContactStatusResponse = Record<string, EnrichmentStatusResponse>

/**
 * Hook to get batch contact enrichment status
 *
 * Useful for getting status of multiple contacts at once (e.g., all contacts for a place).
 *
 * @param contactIds - Array of contact IDs to get status for
 * @param enabled - Whether the query should be enabled (default: true)
 */
export const useBatchContactEnrichmentStatus = (
  contactIds: string[],
  enabled = true,
) => {
  // Sort IDs for stable cache key
  const sortedIds = [...contactIds].sort()

  return useApiQuery<BatchContactStatusResponse>(
    `/enrich/contact/status?${sortedIds.map((id) => `contactIds=${id}`).join('&')}`,
    contactEnrichmentStatusKeys.batch(sortedIds),
    {
      enabled: enabled && sortedIds.length > 0,

      // Stale after 30 seconds
      staleTime: 30_000,

      // Keep in cache for 60 seconds
      gcTime: 60_000,
    },
  )
}
