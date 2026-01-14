import type { UserPlaceMarker } from '@api/shared'
import { useCallback, useEffect, useMemo, useState } from 'react'

export interface UseTableSelectionProps {
  /** All available markers (source of all IDs) */
  markers?: UserPlaceMarker[]
  /** Dependency to trigger selection reset (e.g., filter rules) */
  resetDependency?: unknown
}

export interface UseTableSelectionReturn {
  /** Set of currently selected IDs */
  selectedIds: Set<string>
  /** Number of selected items */
  selectedCount: number
  /** Total number of available items */
  totalCount: number
  /** Check if a specific row is selected */
  isSelected: (id: string) => boolean
  /** Toggle selection for a specific row */
  toggle: (id: string) => void
  /** Select all available items */
  selectAll: () => void
  /** Clear all selections */
  clearAll: () => void
  /** Whether all items are selected */
  isAllSelected: boolean
  /** Whether some (but not all) items are selected */
  isSomeSelected: boolean
  /** Whether no items are selected */
  isNoneSelected: boolean
}

/**
 * Hook for managing table row selection with support for "select all" across pages.
 * Uses marker IDs as the source of all available items.
 *
 * Features:
 * - Tracks selected IDs in a Set for O(1) lookup
 * - Supports "select all" using marker data
 * - Auto-resets selection when resetDependency changes (e.g., filters)
 * - Provides computed states for UI (isAllSelected, isSomeSelected, etc.)
 */
export const useTableSelection = ({
  markers,
  resetDependency,
}: UseTableSelectionProps): UseTableSelectionReturn => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Compute all available IDs from markers
  const allIds = useMemo(
    () => new Set(markers?.map((m) => m.id) ?? []),
    [markers],
  )

  const totalCount = allIds.size
  const selectedCount = selectedIds.size

  // Reset selection when resetDependency changes (e.g., filters)
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    setSelectedIds(new Set())
  }, [resetDependency])

  // Clean up selected IDs that no longer exist in markers
  useEffect(() => {
    if (markers && selectedIds.size > 0) {
      const validIds = new Set<string>()
      for (const id of selectedIds) {
        if (allIds.has(id)) {
          validIds.add(id)
        }
      }
      if (validIds.size !== selectedIds.size) {
        setSelectedIds(validIds)
      }
    }
  }, [markers, allIds, selectedIds])

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  )

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(allIds))
  }, [allIds])

  const clearAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isAllSelected = selectedCount > 0 && selectedCount === totalCount
  const isSomeSelected = selectedCount > 0 && selectedCount < totalCount
  const isNoneSelected = selectedCount === 0

  return {
    selectedIds,
    selectedCount,
    totalCount,
    isSelected,
    toggle,
    selectAll,
    clearAll,
    isAllSelected,
    isSomeSelected,
    isNoneSelected,
  }
}
