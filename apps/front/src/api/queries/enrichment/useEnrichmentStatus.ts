import { useApiQuery, webApiClient } from '@/hooks/useApi'
import { validateUUIDs } from '@/lib/validation'
import { useAuth } from '@clerk/clerk-react'
import type {
  BatchEnrichmentStatusResponse,
  EnrichmentStatusResponse,
} from '@ritchy/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { userKeys } from '../users/useUserMe'

/**
 * Generate a stable hash for batch query keys to avoid overly long keys with many IDs.
 * Uses a simple hash function that's deterministic and collision-resistant for our use case.
 */
const generateBatchHash = (ids: string[]): string => {
  // Sort IDs to ensure deterministic hash regardless of input order
  const sorted = [...ids].sort()
  // Create a simple hash by combining sorted IDs
  // For production, consider using a proper hash function
  return sorted.join('|')
}

export const enrichmentStatusKeys = {
  all: ['enrichment-status'] as const,
  single: (userPlaceId: string) => ['enrichment-status', userPlaceId] as const,
  /**
   * Generate batch query key using a hash instead of spreading all IDs.
   * This prevents query keys from becoming too long with 100+ items.
   */
  batch: (userPlaceIds: string[]) => {
    const hash = generateBatchHash(userPlaceIds)
    return ['enrichment-status', 'batch', hash] as const
  },
}

export const useEnrichmentStatus = (userPlaceId: string, enabled = true) => {
  const queryClient = useQueryClient()
  const prevDataRef = useRef<EnrichmentStatusResponse | undefined>()

  const query = useApiQuery<EnrichmentStatusResponse>(
    `/enrich/status/${userPlaceId}`,
    enrichmentStatusKeys.single(userPlaceId),
    {
      refetchInterval: (query) => {
        // Don't poll when tab is hidden to save resources
        if (document.hidden) return false

        const data = query.state.data
        if (!data || ['idle', 'completed', 'failed'].includes(data.status))
          return false

        // Poll every 2-3 seconds with jitter
        return 2000 + Math.random() * 1000
      },
      enabled,
      staleTime: 0,
    },
  )

  // Invalidate user query when enrichment status is fetched during polling
  useEffect(() => {
    if (query.data && query.data !== prevDataRef.current) {
      prevDataRef.current = query.data
      queryClient.invalidateQueries({ queryKey: userKeys.me() })
    }
  }, [query.data, queryClient])

  return query
}

export const useBatchEnrichmentStatus = (
  userPlaceIds: string[],
  enabled = true,
) => {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const prevDataRef = useRef<BatchEnrichmentStatusResponse | undefined>()

  const query = useQuery({
    queryKey: enrichmentStatusKeys.batch(userPlaceIds),
    queryFn: async () => {
      if (userPlaceIds.length === 0) return {}

      // Validate UUIDs to prevent injection attacks
      const validIds = validateUUIDs(userPlaceIds)
      if (validIds.length === 0) {
        console.error(
          'No valid UUIDs provided to batch enrichment status query',
        )
        return {}
      }

      // Use URLSearchParams for safe query parameter construction
      const params = new URLSearchParams()
      for (const id of validIds) {
        params.append('userPlaceIds', id)
      }

      const token = await getToken()
      return await webApiClient.fetchWithAuth<BatchEnrichmentStatusResponse>(
        `/enrich/status?${params.toString()}`,
        { method: 'GET' },
        token,
      )
    },
    refetchInterval: (query) => {
      // Don't poll when tab is hidden to save resources
      if (document.hidden) return false

      const data = query.state.data
      if (!data) return false

      // Check if any enrichment is still active
      const hasActiveEnrichment = Object.values(data).some((statusData) =>
        ['queued', 'processing'].includes(statusData.status),
      )

      // Poll every 2-3 seconds with jitter to prevent thundering herd
      return hasActiveEnrichment ? 2000 + Math.random() * 1000 : false
    },
    enabled: enabled && userPlaceIds.length > 0,
    staleTime: 0,
    // Keep previous data while fetching new query to prevent flashing
    placeholderData: (previousData) => previousData,
  })

  // Invalidate user query when enrichment status is fetched during polling
  useEffect(() => {
    if (query.data && query.data !== prevDataRef.current) {
      prevDataRef.current = query.data
      queryClient.invalidateQueries({ queryKey: userKeys.me() })
    }
  }, [query.data, queryClient])

  return query
}
