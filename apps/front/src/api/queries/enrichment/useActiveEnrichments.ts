import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'

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
 */
export const useActiveEnrichments = () => {
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
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [query.data])

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
