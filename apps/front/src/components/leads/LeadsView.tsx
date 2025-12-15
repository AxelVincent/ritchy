import {
  useFetchUserPlaceItemPage,
  useUserPlaceFilterOptionsQuery,
  useUserPlaceMarkersQuery,
  useUserPlacesQuery,
} from '@/api/queries/user-places'
import { ApiErrorDisplay } from '@/components/common/ApiErrorDisplay'
import { LoadingMessages } from '@/components/common/LoadingMessages'
import { MapDisplay } from '@/components/map-display/MapDisplay'
import type {
  ContentFilters,
  FilterRule,
  ListFilterOptions,
  PaginationParams,
  Place,
} from '@ritchy/types'
import type { SortingState } from '@tanstack/react-table'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface LeadsViewProps {
  // New filter system
  filterRules: FilterRule[]
  onFilterRulesChange: (rules: FilterRule[]) => void

  // Scope (searchId only - listIds is now in filters)
  searchId?: string

  // API-ready filters (converted from rules, includes listIds)
  filters: ContentFilters
  pagination: PaginationParams
  sorting: SortingState

  // Handlers
  onSortingChange: (sorting: SortingState) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

/**
 * Unified view component for displaying user places.
 * Works with the new filter rule system.
 */
export const LeadsView = ({
  filterRules,
  onFilterRulesChange,
  searchId,
  filters,
  pagination,
  sorting,
  onSortingChange,
  onPageChange,
  onPageSizeChange,
}: LeadsViewProps) => {
  // Extract listIds from filters for React key
  const listIds = filters.listIds ?? []

  // Fetch paginated content with filters (listIds is now part of filters)
  // This query also populates search places if empty on the backend
  const { data, isLoading, isFetching, error, isSuccess } = useUserPlacesQuery({
    searchId,
    filters,
    pagination,
  })

  // Fetch all markers for map (applies same filters, no pagination)
  // Wait for places query to succeed first (it populates search places on backend)
  const { data: markersData } = useUserPlaceMarkersQuery({
    searchId,
    filters,
    enabled: isSuccess,
  })

  // Fetch filter options for multi-select dropdowns
  const { data: filterOptionsData, isLoading: filterOptionsLoading } =
    useUserPlaceFilterOptionsQuery({
      searchId,
      filters,
    })

  // Narrow data types (exclude error responses)
  const contentData = data && !('error' in data) ? data : null
  // Cast to ListFilterOptions - both types have identical structure
  const filterOptions: ListFilterOptions | undefined =
    filterOptionsData && !('error' in filterOptionsData)
      ? (filterOptionsData as ListFilterOptions)
      : undefined
  const markers =
    markersData && !('error' in markersData) ? markersData.markers : undefined
  const places = contentData?.items ?? []

  // Selection state
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [shouldScrollToSelection, setShouldScrollToSelection] = useState(false)
  const pendingPlaceIdRef = useRef<string | null>(null)

  const fetchItemPage = useFetchUserPlaceItemPage()

  // When places change, check if our pending selection is now available
  useEffect(() => {
    const pendingId = pendingPlaceIdRef.current
    if (!pendingId) return

    const placeExists = places.some((p: Place) => p.id === pendingId)
    if (placeExists) {
      setSelectedPlaceId(pendingId)
      setShouldScrollToSelection(true)
      pendingPlaceIdRef.current = null
    }
  }, [places])

  // Clear selection if the selected place is no longer in the data
  useEffect(() => {
    if (!selectedPlaceId || pendingPlaceIdRef.current) return

    const placeExists = places.some((p: Place) => p.id === selectedPlaceId)
    if (!placeExists && places.length > 0) {
      setSelectedPlaceId(null)
    }
  }, [places, selectedPlaceId])

  const handleMarkerClick = useCallback(
    async (placeId: string) => {
      const isOnCurrentPage = places.some((p: Place) => p.id === placeId)

      if (isOnCurrentPage) {
        setSelectedPlaceId(placeId)
        setShouldScrollToSelection(true)
        return
      }

      // Place is not on current page - need to navigate
      pendingPlaceIdRef.current = placeId
      setSelectedPlaceId(placeId) // Show visual feedback on marker

      try {
        const pageData = await fetchItemPage(placeId, {
          searchId,
          filters,
          pageSize: pagination?.pageSize,
          sortBy: pagination?.sortBy,
          sortOrder: pagination?.sortOrder,
        })

        if (pageData && 'page' in pageData && pageData.page) {
          onPageChange(pageData.page)
        }
      } catch (err) {
        console.error('Failed to fetch item page:', err)
        pendingPlaceIdRef.current = null
      }
    },
    [places, searchId, filters, pagination, onPageChange, fetchItemPage],
  )

  const handleTableRowClick = useCallback((placeId: string) => {
    setSelectedPlaceId(placeId)
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

  if (isLoading) return <LoadingMessages />
  if (error) return <ApiErrorDisplay error={error} />
  if (!contentData) return null

  return (
    <MapDisplay
      key={`${listIds.join('-') || 'all'}-${searchId ?? ''}`}
      searchId={searchId}
      places={contentData.items}
      // New filter system props
      filterRules={filterRules}
      onFilterRulesChange={onFilterRulesChange}
      filterOptions={filterOptions}
      filterOptionsLoading={filterOptionsLoading}
      // Server-side mode props
      serverSide
      pagination={contentData.pagination}
      markers={markers}
      sorting={sorting}
      onSortingChange={onSortingChange}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      isLoading={isFetching}
      // Selection props
      selectedPlaceId={selectedPlaceId}
      onMarkerClick={handleMarkerClick}
      onTableRowClick={handleTableRowClick}
      onSelectionClear={clearSelection}
      shouldScrollToSelection={shouldScrollToSelection}
      onScrollComplete={onScrollComplete}
      // Export props
      filters={filters}
      sortBy={pagination.sortBy}
      sortOrder={pagination.sortOrder}
    />
  )
}
