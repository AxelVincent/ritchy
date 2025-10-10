import { useApiQuery } from '@/hooks/useApi'
import type { BatchEnrichmentStatusResponse } from '@ritchy/types'
import { useMemo } from 'react'

export const batchEnrichmentStatusKeys = {
  all: ['batch-enrichment-status'] as const,
  batch: (userPlaceIds: string[]) =>
    ['batch-enrichment-status', ...userPlaceIds.sort()] as const,
}

/**
 * Hook to fetch enrichment status for multiple places in a single request
 *
 * Benefits:
 * - Single HTTP request instead of N requests
 * - Reduced server load and network traffic
 * - Optimized for virtualized lists
 * - Automatic cache deduplication by TanStack Query
 *
 * @param userPlaceIds - Array of user place IDs to fetch status for
 * @param enabled - Whether the query should be enabled (default: true)
 */
export const useBatchEnrichmentStatus = (
  userPlaceIds: string[],
  enabled = true,
) => {
  // Sort IDs to ensure consistent cache keys
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const sortedIds = useMemo(
    () => [...userPlaceIds].sort(),
    [userPlaceIds.join(',')],
  )

  // Build query string - backend expects userPlaceIds[] array param
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const queryString = useMemo(
    () => sortedIds.map((id) => `userPlaceIds=${id}`).join('&'),
    [sortedIds.join(',')],
  )

  const query = useApiQuery<BatchEnrichmentStatusResponse>(
    `/enrich/status?${queryString}`,
    batchEnrichmentStatusKeys.batch(sortedIds),
    {
      enabled: enabled && sortedIds.length > 0,

      // Aggressive caching - trust WebSocket updates
      staleTime: 30000, // 30 seconds

      // Keep data for virtualized rows that scroll out of view
      gcTime: 60000, // 1 minute

      // Don't refetch on window focus for performance
      refetchOnWindowFocus: false,
    },
  )

  return query
}
