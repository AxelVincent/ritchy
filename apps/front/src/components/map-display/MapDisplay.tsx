import { DataTable } from '@/components/data-table/DataTable'
import { EmptyListState } from '@/components/lists/empty-list-state'
import { MapBox } from '@/components/map-display/components/map_box/MapBox'
import { DEFAULT_LOCATION } from '@/components/map-display/constants'
import type { Location } from '@/components/search/search-map'
import { ResizablePanelGroup } from '@/components/ui/resizable'
import { ResizableHandle } from '@/components/ui/resizable'
import { ResizablePanel } from '@/components/ui/resizable'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Place } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import { ListIcon, MapIcon } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { columns } from '../../components/data-table/Columns'
import { SelectedPlaceCard } from './components/map_box/place-details/SelectedPlaceCard'
import { useMapStore } from './store/useMapStore'

interface MapDisplayProps {
  listId?: string
  searchId?: string
  places: Place[]
}

// Add a loading component for the Suspense fallback
const TableLoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full p-8">
    <div className="animate-pulse text-muted-foreground">
      Loading table data...
    </div>
  </div>
)

export const MapDisplay = ({ listId, searchId, places }: MapDisplayProps) => {
  const isMobile = useIsMobile()
  const { selectedPlaceId } = useMapStore()
  const [mobileView, setMobileView] = useState<'map' | 'table'>(() => {
    const savedView = localStorage.getItem('mobileMapView')
    return savedView === 'map' || savedView === 'table' ? savedView : 'map'
  })

  // Core location state
  const defaultLocation =
    places && places.length > 0
      ? {
          center: {
            latitude: places[0].location.latitude,
            longitude: places[0].location.longitude,
          },
          bounds: DEFAULT_LOCATION.bounds,
        }
      : DEFAULT_LOCATION

  const [currentLocation, setLocation] = useState<Location>(defaultLocation)

  // Add state for panel sizes with localStorage persistence
  const [panelSizes, setPanelSizes] = useState<number[]>(() => {
    // Try to get saved panel sizes from localStorage
    const savedSizes = localStorage.getItem('mapDisplayPanelSizes')
    return savedSizes ? JSON.parse(savedSizes) : [60, 40] // Default to 60/40 split
  })

  // Save panel sizes to localStorage when they change
  const handlePanelResize = (sizes: number[]) => {
    setPanelSizes(sizes)
    localStorage.setItem('mapDisplayPanelSizes', JSON.stringify(sizes))
  }

  const [searchResults, setSearchResults] = useState<Place[]>(places || [])

  // Search and selection state
  const [dataTableRowSelection, setDataTableRowSelection] =
    useState<RowSelectionState>({})
  const [filteredPlaceIds, setFilteredPlaceIds] = useState<Set<string>>(
    () =>
      new Set(
        places && places.length > 0
          ? places.map((item) => item.id)
          : searchResults.map((item) => item.id),
      ),
  )

  // Add a safety check to ensure we never pass undefined
  const safeFilteredPlaceIds = filteredPlaceIds ?? new Set<string>()

  // Effects
  useEffect(() => {
    if (currentLocation) {
      setLocation(currentLocation)
    }
  }, [currentLocation])

  const [tableData, setTableData] = useState<Place[]>(places)

  useEffect(() => {
    if (places && places.length > 0) {
      setSearchResults(places)
      setTableData(places)
    }
  }, [places])

  if (listId && places && places.length === 0) {
    return <EmptyListState listId={listId} />
  }

  // On mobile, show only the DataTable
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col h-full relative">
          {/* Content area with both views always mounted but conditionally visible */}
          <div className="flex-1 relative">
            <div
              className={`h-full w-full absolute inset-0 ${mobileView === 'map' ? 'block' : 'hidden'}`}
            >
              <MapBox
                searchResults={searchResults}
                userLocation={currentLocation}
                filteredPlaceIds={safeFilteredPlaceIds}
              />
            </div>
            <div
              className={`h-full w-full absolute inset-0 ${mobileView === 'table' ? 'block' : 'hidden'}`}
            >
              <div className="h-full overflow-auto">
                <Suspense fallback={<TableLoadingFallback />}>
                  <DataTable
                    columns={columns}
                    data={tableData}
                    setDataTableRowSelection={setDataTableRowSelection}
                    dataTableRowSelection={dataTableRowSelection}
                    onFilteredDataChange={setFilteredPlaceIds}
                    listId={listId}
                    searchId={searchId}
                  />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Toggle as a fixed element at the bottom */}
          <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
            <div className="inline-flex items-center rounded-md border border-input bg-background/95 backdrop-blur-sm shadow-md p-1 text-sm pointer-events-auto">
              <button
                type="button"
                onClick={() => setMobileView('map')}
                className={`px-3 py-1.5 flex items-center gap-1.5 rounded-sm ${
                  mobileView === 'map'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                Map
              </button>
              <button
                type="button"
                onClick={() => setMobileView('table')}
                className={`px-3 py-1.5 flex items-center gap-1.5 rounded-sm ${
                  mobileView === 'table'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                <ListIcon className="h-3.5 w-3.5" />
                List
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Desktop view with resizable panels
  return (
    <div className="flex flex-col h-full">
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={handlePanelResize}
        className="min-h-[200px]"
      >
        <ResizablePanel
          defaultSize={panelSizes[0]}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {selectedPlaceId ? (
            <ResizablePanelGroup direction="vertical" className="h-full">
              <ResizablePanel
                defaultSize={70}
                className="flex flex-col overflow-hidden"
              >
                <div className="flex flex-col h-full overflow-hidden">
                  <DataTable
                    columns={columns}
                    data={tableData}
                    setDataTableRowSelection={setDataTableRowSelection}
                    dataTableRowSelection={dataTableRowSelection}
                    onFilteredDataChange={setFilteredPlaceIds}
                    listId={listId}
                    searchId={searchId}
                  />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={20} maxSize={60}>
                <div className="border-t bg-background h-full">
                  <SelectedPlaceCard
                    places={places}
                    displayedPlaceIds={safeFilteredPlaceIds}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <DataTable
                columns={columns}
                data={tableData}
                setDataTableRowSelection={setDataTableRowSelection}
                dataTableRowSelection={dataTableRowSelection}
                onFilteredDataChange={setFilteredPlaceIds}
                listId={listId}
                searchId={searchId}
              />
            </div>
          )}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={panelSizes[1]} className="flex-1">
          <MapBox
            searchResults={searchResults}
            userLocation={currentLocation}
            filteredPlaceIds={safeFilteredPlaceIds}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
