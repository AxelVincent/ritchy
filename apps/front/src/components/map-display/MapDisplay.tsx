import { DEFAULT_LOCATION } from '@/components/map-display/constants'

import { DataTable } from '@/components/data-table/DataTable'
import { EmptyListState } from '@/components/lists/empty-list-state'
import { ResizablePanelGroup } from '@/components/ui/resizable'
import { ResizableHandle } from '@/components/ui/resizable'
import { ResizablePanel } from '@/components/ui/resizable'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Place } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import { ListIcon } from 'lucide-react'
import { MapIcon } from 'lucide-react'
import { Suspense, lazy, useEffect, useState } from 'react'
import { columns } from '../../components/data-table/Columns'
import { useMapStore } from './store/useMapStore'
import type { MapboxLocationParameters } from './types'

interface MapDisplayProps {
  listId?: string
  searchId?: string
  places: Place[]
}

// Lazy load the DataTable component
const LazyDataTable = lazy(() =>
  import('@/components/data-table/DataTable').then((module) => ({
    default: module.DataTable,
  })),
)

// Lazy load the MapBox component
const LazyMapBox = lazy(() =>
  import('@/components/map-display/components/map_box/MapBox').then(
    (module) => ({
      default: module.MapBox,
    }),
  ),
)

// Add a loading component for the Suspense fallback
const TableLoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full p-8">
    <div className="animate-pulse text-muted-foreground">
      Loading table data...
    </div>
  </div>
)

// Add a map loading component for the Suspense fallback
const MapLoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full p-8">
    <div className="animate-pulse text-muted-foreground">Loading map...</div>
  </div>
)

export const MapDisplay = ({ listId, searchId, places }: MapDisplayProps) => {
  const isMobile = useIsMobile()
  const { setPlaces } = useMapStore()

  // Core location state
  const defaultLocation =
    places && places.length > 0
      ? {
          latitude: places[0].location.latitude,
          longitude: places[0].location.longitude,
          radiusInMeters: DEFAULT_LOCATION.radiusInMeters,
        }
      : DEFAULT_LOCATION

  const [currentLocation, setLocation] =
    useState<MapboxLocationParameters>(defaultLocation)

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

  // Search and selection state
  const [dataTableRowSelection, setDataTableRowSelection] =
    useState<RowSelectionState>({})

  // Add state for mobile view toggle with localStorage persistence
  const [mobileView, setMobileView] = useState<'map' | 'table'>(() => {
    const savedView = localStorage.getItem('mobileMapView')
    return savedView === 'map' || savedView === 'table' ? savedView : 'map'
  })

  // Save mobile view preference to localStorage
  useEffect(() => {
    localStorage.setItem('mobileMapView', mobileView)
  }, [mobileView])

  // Effects
  useEffect(() => {
    if (currentLocation) {
      setLocation(currentLocation)
    }
  }, [currentLocation])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (places && places.length > 0) {
      setPlaces(places)
    }
  }, [places])

  if (listId && places && places.length === 0) {
    return <EmptyListState listId={listId} />
  }

  // On mobile, show either the Map or DataTable based on toggle state
  if (isMobile) {
    return (
      <div className="flex flex-col h-full relative">
        {/* Content area with both views always mounted but conditionally visible */}
        <div className="flex-1 relative">
          <div
            className={`h-full w-full absolute inset-0 ${mobileView === 'map' ? 'block' : 'hidden'}`}
          >
            <Suspense fallback={<MapLoadingFallback />}>
              <LazyMapBox
                userLocation={currentLocation}
                dataTableRowSelection={dataTableRowSelection}
                radiusInMeters={currentLocation.radiusInMeters}
                isMobile={true}
                listId={listId ?? null}
              />
            </Suspense>
          </div>
          <div
            className={`h-full w-full absolute inset-0 ${mobileView === 'table' ? 'block' : 'hidden'}`}
          >
            <div className="h-full overflow-auto">
              <Suspense fallback={<TableLoadingFallback />}>
                <DataTable
                  columns={columns}
                  setDataTableRowSelection={setDataTableRowSelection}
                  dataTableRowSelection={dataTableRowSelection}
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
          <Suspense fallback={<TableLoadingFallback />}>
            <LazyDataTable
              columns={columns}
              setDataTableRowSelection={setDataTableRowSelection}
              dataTableRowSelection={dataTableRowSelection}
              listId={listId}
              searchId={searchId}
            />
          </Suspense>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={panelSizes[1]} className="flex-1">
          <Suspense fallback={<MapLoadingFallback />}>
            <LazyMapBox
              userLocation={currentLocation}
              dataTableRowSelection={dataTableRowSelection}
              radiusInMeters={currentLocation.radiusInMeters}
              isMobile={false}
              listId={listId ?? null}
            />
          </Suspense>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
