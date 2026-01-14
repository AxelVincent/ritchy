import { useFetchUserPlaceItemPage } from '@/api/queries/user-places/useFetchItemPage'
import type { ContentFilters, PaginationParams, Place } from '@api/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseMarkerSelectionOptions {
  searchId?: string
  places: Place[]
  filters?: ContentFilters
  pagination?: Partial<PaginationParams>
  onPageChange?: (page: number) => void
}

interface UseMarkerSelectionReturn {
  selectedPlaceId: string | null
  handleMarkerClick: (placeId: string) => void
  handleTableRowClick: (placeId: string) => void
  clearSelection: () => void
  // Ref that DataTable uses to know when to scroll
  shouldScrollToSelection: boolean
  onScrollComplete: () => void
}

/**
 * Single hook that manages all marker/row selection logic.
 *
 * Handles:
 * - Selecting places from map or table
 * - Navigating to correct page when selecting off-page marker
 * - Triggering scroll in DataTable after page loads
 * - Clearing selection when place no longer exists
 */
export const useMarkerSelection = ({
  searchId,
  places,
  filters,
  pagination,
  onPageChange,
}: UseMarkerSelectionOptions): UseMarkerSelectionReturn => {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [shouldScrollToSelection, setShouldScrollToSelection] = useState(false)

  // Track if we're waiting for a page navigation
  const pendingPlaceIdRef = useRef<string | null>(null)

  const fetchItemPage = useFetchUserPlaceItemPage()

  // When places change, check if our pending selection is now available
  useEffect(() => {
    const pendingId = pendingPlaceIdRef.current
    if (!pendingId) return

    const placeExists = places.some((p) => p.id === pendingId)
    if (placeExists) {
      // Pending place is now in the data - complete the selection
      setSelectedPlaceId(pendingId)
      setShouldScrollToSelection(true)
      pendingPlaceIdRef.current = null
    }
  }, [places])

  // Clear selection if the selected place is no longer in the data
  // (but not if we're waiting for a page navigation)
  useEffect(() => {
    if (!selectedPlaceId || pendingPlaceIdRef.current) return

    const placeExists = places.some((p) => p.id === selectedPlaceId)
    if (!placeExists && places.length > 0) {
      setSelectedPlaceId(null)
    }
  }, [places, selectedPlaceId])

  const handleMarkerClick = useCallback(
    async (placeId: string) => {
      // Check if place is on current page
      const isOnCurrentPage = places.some((p) => p.id === placeId)

      if (isOnCurrentPage) {
        // Simple case: place is here, just select it
        setSelectedPlaceId(placeId)
        setShouldScrollToSelection(true)
        return
      }

      // Place is not on current page - need to navigate
      pendingPlaceIdRef.current = placeId

      // Immediately show visual feedback on marker (via selectedPlaceId)
      // This also centers the map on the marker
      setSelectedPlaceId(placeId)

      try {
        const pageData = await fetchItemPage(placeId, {
          searchId,
          filters,
          pageSize: pagination?.pageSize,
          sortBy: pagination?.sortBy,
          sortOrder: pagination?.sortOrder,
        })

        if (
          pageData &&
          !('error' in pageData) &&
          pageData.page &&
          onPageChange
        ) {
          onPageChange(pageData.page)
          // The useEffect watching `places` will complete the selection
          // when the new page data arrives
        }
      } catch (error) {
        // Navigation failed - clear pending state
        console.error('Failed to fetch item page:', error)
        pendingPlaceIdRef.current = null
      }
    },
    [places, searchId, filters, pagination, onPageChange, fetchItemPage],
  )

  const handleTableRowClick = useCallback((placeId: string) => {
    // Table clicks don't need page navigation - the row is already visible
    setSelectedPlaceId(placeId)
    // Don't trigger scroll - user clicked it, they can see it
    setShouldScrollToSelection(false)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedPlaceId(null)
    pendingPlaceIdRef.current = null
    setShouldScrollToSelection(false)
  }, [])

  const onScrollComplete = useCallback(() => {
    setShouldScrollToSelection(false)
  }, [])

  return {
    selectedPlaceId,
    handleMarkerClick,
    handleTableRowClick,
    clearSelection,
    shouldScrollToSelection,
    onScrollComplete,
  }
}
