import { debugLog } from '@/lib/utils/debug-logging'
import type { EnrichmentStatusResponse } from '@api/routes_web/enrich/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { enrichmentStatusKeys } from './useEnrichmentStatus'

const ACTIVE_ENRICHMENTS_KEY = ['active-enrichments'] as const
const STORAGE_KEY = 'active-enrichments'

/**
 * Query keys for active enrichments
 */
export const activeEnrichmentsKeys = {
  all: ACTIVE_ENRICHMENTS_KEY,
}

/**
 * Hook to manage active enrichments using TanStack Query as single source of truth.
 *
 * Benefits:
 * - No custom event system needed
 * - Automatic reactivity
 * - Type-safe
 * - Proper cache invalidation
 * - localStorage only used for persistence
 *
 * @internal Currently unused - kept for potential future use. activeEnrichmentsKeys is used instead.
 */
const _useActiveEnrichments = () => {
  const queryClient = useQueryClient()

  // Query for active enrichments - single source of truth
  const query = useQuery({
    queryKey: activeEnrichmentsKeys.all,
    queryFn: (): string[] => {
      // On initial mount, try to restore from localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
      } catch (error) {
        console.error(
          'Failed to restore active enrichments from localStorage:',
          error,
        )
        return []
      }
    },
    staleTime: Number.POSITIVE_INFINITY, // Never auto-refetch, we manage updates manually
    gcTime: Number.POSITIVE_INFINITY, // Keep in cache forever (until page reload)
  })

  // Persist to localStorage whenever query data changes (debounced)
  useEffect(() => {
    if (!query.data) return

    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(query.data))
      } catch (error) {
        console.error(
          'Failed to persist active enrichments to localStorage:',
          error,
        )
      }
    }, 2000) // 2s debounce (increased from 500ms for bulk operations)

    return () => clearTimeout(timeoutId)
  }, [query.data])

  // Event-driven cleanup: Remove completed enrichments after 30 seconds
  // This replaces the previous polling-based approach for better performance
  useEffect(() => {
    if (!query.data || query.data.length === 0) return

    const cleanupTimeouts = new Map<string, NodeJS.Timeout>()

    // Schedule cleanup for each active enrichment based on status changes
    for (const userPlaceId of query.data) {
      const statusData = queryClient.getQueryData<EnrichmentStatusResponse>(
        enrichmentStatusKeys.single(userPlaceId),
      )

      // If enrichment is completed/failed, schedule cleanup after 30 seconds
      if (
        statusData &&
        (statusData.status === 'completed' || statusData.status === 'failed')
      ) {
        const age = Date.now() - statusData.updatedAt
        const remainingTime = Math.max(30000 - age, 0)

        // Only schedule if not already scheduled
        if (!cleanupTimeouts.has(userPlaceId)) {
          const timeoutId = setTimeout(() => {
            debugLog(
              `[ActiveEnrichments] Event-driven cleanup for ${userPlaceId}`,
            )
            queryClient.setQueryData<string[]>(
              activeEnrichmentsKeys.all,
              (old = []) => old.filter((id) => id !== userPlaceId),
            )
            cleanupTimeouts.delete(userPlaceId)
          }, remainingTime)

          cleanupTimeouts.set(userPlaceId, timeoutId)
        }
      }
    }

    // Cleanup function: clear all pending timeouts
    return () => {
      for (const timeoutId of cleanupTimeouts.values()) {
        clearTimeout(timeoutId)
      }
      cleanupTimeouts.clear()
    }
  }, [query.data, queryClient])

  // Helper to add enrichment IDs
  const addEnrichments = useCallback(
    (userPlaceIds: string[]) => {
      queryClient.setQueryData<string[]>(
        activeEnrichmentsKeys.all,
        (old = []) => {
          return Array.from(new Set([...old, ...userPlaceIds]))
        },
      )
    },
    [queryClient],
  )

  // Helper to remove enrichment IDs
  const removeEnrichments = useCallback(
    (userPlaceIds: string[]) => {
      queryClient.setQueryData<string[]>(
        activeEnrichmentsKeys.all,
        (old = []) => {
          return old.filter((id) => !userPlaceIds.includes(id))
        },
      )
    },
    [queryClient],
  )

  // Helper to clear all enrichments
  const clearAll = useCallback(() => {
    queryClient.setQueryData<string[]>(activeEnrichmentsKeys.all, [])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error(
        'Failed to clear active enrichments from localStorage:',
        error,
      )
    }
  }, [queryClient])

  return {
    activeEnrichments: query.data ?? [],
    addEnrichments,
    removeEnrichments,
    clearAll,
    isLoading: query.isLoading,
  }
}

// Suppress unused variable warning - hook kept for potential future use
void _useActiveEnrichments
