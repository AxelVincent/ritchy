import { DataTable } from '@/components/data-table/DataTable'
import { EnrichmentErrorBoundary } from '@/components/data-table/enrich/EnrichmentErrorBoundary'
import { EmptyListState } from '@/components/lists/empty-list-state'
import { MobileBottomBar } from '@/components/map-display/MobileBottomBar'
import { MapBox } from '@/components/map-display/components/map_box/MapBox'
import { DEFAULT_LOCATION } from '@/components/map-display/constants'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { EnrichmentMutationProvider } from '@/contexts/EnrichmentMutationContext'
import { FilterOptionsContext } from '@/contexts/FilterOptionsContext'
import { SelectionProvider } from '@/contexts/SelectionContext'
import { TableSelectionProvider } from '@/contexts/TableSelectionContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { useTableSelection } from '@/hooks/useTableSelection'
import type {
  ContentFilters,
  FilterRule,
  ListFilterOptions,
  PaginationMeta,
  Place,
  SortOrder,
  UserPlaceMarker,
} from '@ritchy/types'
import type { SortingState } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { columns } from '../../components/data-table/Columns'
import { SelectedPlaceCard } from '../place-details/SelectedPlaceCard'

// Define mobile layout states (simplified to two modes)
type MobileLayoutState = 'table' | 'map'

interface MapDisplayProps {
  listId?: string
  searchId?: string
  places: Place[]
  // New filter system props
  filterRules: FilterRule[]
  onFilterRulesChange: (rules: FilterRule[]) => void
  filterOptions?: ListFilterOptions
  filterOptionsLoading?: boolean
  // Server-side mode props
  serverSide?: boolean
  pagination?: PaginationMeta
  markers?: UserPlaceMarker[]
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  isLoading?: boolean
  // Selection props (from useMarkerSelection hook)
  selectedPlaceId: string | null
  onMarkerClick: (placeId: string) => void
  onTableRowClick: (placeId: string) => void
  onSelectionClear: () => void
  shouldScrollToSelection: boolean
  onScrollComplete: () => void
  // Export props
  filters?: ContentFilters
  sortBy?: string
  sortOrder?: SortOrder
}

export const MapDisplay = ({
  listId,
  searchId,
  places,
  // New filter system props
  filterRules,
  onFilterRulesChange,
  filterOptions,
  filterOptionsLoading,
  // Server-side mode props
  serverSide = false,
  pagination,
  markers,
  sorting: externalSorting,
  onSortingChange,
  onPageChange,
  onPageSizeChange,
  isLoading,
  // Selection props
  selectedPlaceId,
  onMarkerClick,
  onTableRowClick,
  onSelectionClear,
  shouldScrollToSelection,
  onScrollComplete,
  // Export props
  filters,
  sortBy,
  sortOrder,
}: MapDisplayProps) => {
  const isMobile = useIsMobile()

  // Mobile layout state: 'table' (full list) or 'map' (full map)
  const [mobileLayout, setMobileLayout] = useState<MobileLayoutState>(() => {
    const savedState = localStorage.getItem('mobileLayoutState')
    // Migrate old 'balanced' state to 'table'
    if (savedState === 'balanced' || savedState === 'table') {
      return 'table'
    }
    if (savedState === 'map') {
      return 'map'
    }
    return 'table'
  })

  // Table selection state - uses markers for "select all" functionality
  // Resets when filterRules change
  const tableSelection = useTableSelection({
    markers,
    resetDependency: filterRules,
  })

  // Compute initial center from first place or markers, or default
  const initialCenter = useMemo((): { latitude: number; longitude: number } => {
    if (places && places.length > 0) {
      return {
        latitude: places[0].location.latitude,
        longitude: places[0].location.longitude,
      }
    }
    if (markers && markers.length > 0) {
      return {
        latitude: markers[0].location.latitude,
        longitude: markers[0].location.longitude,
      }
    }
    return DEFAULT_LOCATION.center
  }, [places, markers])

  // Filtered place IDs from DataTable (client-side filtering)
  const [filteredPlaceIds, setFilteredPlaceIds] = useState<Set<string>>(
    () => new Set(places?.map((item) => item.id) ?? []),
  )

  // Update filtered IDs when places change
  useEffect(() => {
    if (places && places.length > 0) {
      setFilteredPlaceIds(new Set(places.map((item) => item.id)))
    }
  }, [places])

  // Save mobile layout state to localStorage
  useEffect(() => {
    if (isMobile) {
      localStorage.setItem('mobileLayoutState', mobileLayout)
    }
  }, [mobileLayout, isMobile])

  if (listId && places && places.length === 0) {
    return <EmptyListState listId={listId} />
  }

  const setLayoutWithFeedback = (layout: MobileLayoutState) => {
    // Trigger haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10) // Very subtle 10ms vibration
    }
    setMobileLayout(layout)
  }

  // Table selection context value
  const tableSelectionContextValue = {
    isSelected: tableSelection.isSelected,
    toggle: tableSelection.toggle,
    selectAll: tableSelection.selectAll,
    clearAll: tableSelection.clearAll,
    isAllSelected: tableSelection.isAllSelected,
    isSomeSelected: tableSelection.isSomeSelected,
    selectedCount: tableSelection.selectedCount,
    totalCount: tableSelection.totalCount,
    selectedIds: tableSelection.selectedIds,
  }

  // Shared DataTable component
  const dataTableElement = (
    <EnrichmentErrorBoundary>
      <DataTable
        columns={columns}
        data={places}
        listId={listId}
        searchId={searchId}
        onFilteredDataChange={setFilteredPlaceIds}
        storageKey={listId ?? searchId}
        isMobile={isMobile}
        // Server-side mode props
        serverSide={serverSide}
        onSortingChange={onSortingChange}
        externalSorting={externalSorting}
        // Selection props
        selectedPlaceId={selectedPlaceId}
        onRowClick={onTableRowClick}
        shouldScrollToSelection={shouldScrollToSelection}
        onScrollComplete={onScrollComplete}
        // Filter props
        filterRules={filterRules}
        onFilterRulesChange={onFilterRulesChange}
        filterOptions={filterOptions}
        filterOptionsLoading={filterOptionsLoading}
        // Pagination props
        pagination={pagination}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        isLoading={isLoading}
        // Export props
        filters={filters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        // Table selection
        onSelectAll={tableSelection.selectAll}
      />
    </EnrichmentErrorBoundary>
  )

  // Shared MapBox component
  const mapBoxElement = (
    <MapBox
      markers={markers}
      selectedPlaceId={selectedPlaceId}
      onMarkerClick={onMarkerClick}
      initialCenter={initialCenter}
    />
  )

  return (
    <FilterOptionsContext.Provider value={filterOptions ?? null}>
      <SelectionProvider onSelectPlace={onTableRowClick}>
        <TableSelectionProvider value={tableSelectionContextValue}>
          <EnrichmentMutationProvider>
            <div className="flex h-full relative">
              {/* Mobile layout - full screen toggle between list and map */}
              {isMobile ? (
                <div className="flex-1 flex flex-col overflow-hidden pb-14">
                  {mobileLayout === 'table' ? (
                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                      {dataTableElement}
                    </div>
                  ) : (
                    <div className="flex-1 overflow-hidden">
                      {mapBoxElement}
                    </div>
                  )}
                </div>
              ) : (
                /* Desktop layout - resizable panels */
                <>
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <ResizablePanelGroup
                      direction="vertical"
                      className="h-full"
                    >
                      <ResizablePanel
                        defaultSize={70}
                        className="flex flex-col overflow-hidden"
                      >
                        <div className="flex flex-col h-full overflow-hidden">
                          {dataTableElement}
                        </div>
                      </ResizablePanel>
                      <ResizableHandle withHandle />
                      <ResizablePanel
                        defaultSize={30}
                        className="flex flex-col overflow-hidden"
                      >
                        {mapBoxElement}
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </div>

                  {selectedPlaceId && (
                    <div className="w-[550px] border-l bg-background h-full overflow-auto">
                      <SelectedPlaceCard
                        places={places}
                        displayedPlaceIds={filteredPlaceIds}
                        selectedPlaceId={selectedPlaceId}
                        onClose={onSelectionClear}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Mobile bottom navigation bar */}
              {isMobile && (
                <MobileBottomBar
                  mobileLayout={mobileLayout}
                  onLayoutChange={setLayoutWithFeedback}
                  pagination={pagination}
                  onPageChange={onPageChange}
                />
              )}

              {/* Mobile place details sheet */}
              {isMobile && (
                <Sheet
                  open={!!selectedPlaceId}
                  onOpenChange={(open) => {
                    if (!open) {
                      onSelectionClear()
                    }
                  }}
                >
                  <SheetContent
                    side="bottom"
                    className="h-[90vh] p-0 flex flex-col [&>button:first-child]:hidden"
                  >
                    <SelectedPlaceCard
                      places={places}
                      displayedPlaceIds={filteredPlaceIds}
                      selectedPlaceId={selectedPlaceId}
                      onClose={onSelectionClear}
                    />
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </EnrichmentMutationProvider>
        </TableSelectionProvider>
      </SelectionProvider>
    </FilterOptionsContext.Provider>
  )
}
