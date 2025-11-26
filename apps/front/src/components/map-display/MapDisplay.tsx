import { DataTable } from '@/components/data-table/DataTable'
import { EnrichmentErrorBoundary } from '@/components/data-table/enrich/EnrichmentErrorBoundary'
import { EmptyListState } from '@/components/lists/empty-list-state'
import { MapBox } from '@/components/map-display/components/map_box/MapBox'
import { DEFAULT_LOCATION } from '@/components/map-display/constants'
import type { Location } from '@/components/search/search-map'
import { ResizablePanelGroup } from '@/components/ui/resizable'
import { ResizableHandle } from '@/components/ui/resizable'
import { ResizablePanel } from '@/components/ui/resizable'
import { EnrichmentMutationProvider } from '@/contexts/EnrichmentMutationContext'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Place } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import { ListIcon, MapIcon, Maximize2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { columns } from '../../components/data-table/Columns'
import { SelectedPlaceCard } from '../place-details/SelectedPlaceCard'
import { useMapStore } from './store/useMapStore'

interface MapDisplayProps {
  listId?: string
  searchId?: string
  places: Place[]
}

// Define mobile layout states
type MobileLayoutState = 'table' | 'balanced' | 'map'

export const MapDisplay = ({ listId, searchId, places }: MapDisplayProps) => {
  const isMobile = useIsMobile()
  const { selectedPlaceId, setSelectedPlaceId } = useMapStore()

  // Mobile layout state: 'table' (more list), 'balanced' (50/50), 'map' (more map)
  const [mobileLayout, setMobileLayout] = useState<MobileLayoutState>(() => {
    const savedState = localStorage.getItem('mobileLayoutState')
    return (savedState as MobileLayoutState) || 'balanced'
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

  // Clear selectedPlaceId if the selected place is not in the current places array
  useEffect(() => {
    if (selectedPlaceId && places && places.length > 0) {
      const placeExists = places.some((place) => place.id === selectedPlaceId)
      if (!placeExists) {
        setSelectedPlaceId(null)
      }
    }
  }, [places, selectedPlaceId, setSelectedPlaceId])

  // Save mobile layout state
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

  return (
    <EnrichmentMutationProvider>
      <div className="flex h-full relative">
        <div className="flex-1 flex flex-col overflow-hidden">
          <ResizablePanelGroup direction="vertical" className="h-full">
            <ResizablePanel
              defaultSize={70}
              className="flex flex-col overflow-hidden"
            >
              <div className="flex flex-col h-full overflow-hidden">
                <EnrichmentErrorBoundary>
                  <DataTable
                    columns={columns}
                    data={tableData}
                    setDataTableRowSelection={setDataTableRowSelection}
                    dataTableRowSelection={dataTableRowSelection}
                    onFilteredDataChange={setFilteredPlaceIds}
                    listId={listId}
                    searchId={searchId}
                    isMobile={isMobile}
                  />
                </EnrichmentErrorBoundary>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={30}
              className="flex flex-col overflow-hidden"
            >
              <MapBox
                searchResults={searchResults}
                userLocation={currentLocation}
                filteredPlaceIds={safeFilteredPlaceIds}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {!isMobile && selectedPlaceId && (
          <div className="w-[550px] border-l bg-background h-full overflow-auto">
            <SelectedPlaceCard
              places={places}
              displayedPlaceIds={safeFilteredPlaceIds}
            />
          </div>
        )}

        {/* Mobile segmented control */}
        {isMobile && (
          <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
            <div className="inline-flex items-center rounded-lg border border-input bg-background/95 backdrop-blur-sm shadow-lg p-1 pointer-events-auto">
              <button
                type="button"
                onClick={() => setLayoutWithFeedback('table')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  mobileLayout === 'table'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ListIcon className="h-3.5 w-3.5" />
                <span className="text-xs">List</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutWithFeedback('balanced')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  mobileLayout === 'balanced'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="text-xs">Both</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutWithFeedback('map')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  mobileLayout === 'map'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span className="text-xs">Map</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </EnrichmentMutationProvider>
  )
}
