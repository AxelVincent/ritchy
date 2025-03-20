import { DataTable } from '@/components/data-table/DataTable'
import { MapBox } from '@/components/map-display/components/map_box/MapBox'
import { DEFAULT_LOCATION } from '@/components/map-display/constants'

import { EmptyListState } from '@/components/lists/empty-list-state'
import { ResizablePanelGroup } from '@/components/ui/resizable'
import { ResizableHandle } from '@/components/ui/resizable'
import { ResizablePanel } from '@/components/ui/resizable'
import { useMediaQuery } from '@/hooks/use-media-query'
import type { Place } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { columns } from '../../components/data-table/Columns'
import { useMapStore } from './store/useMapStore'
import type { MapboxLocationParameters } from './types'

interface MapDisplayProps {
  listId?: string
  searchId?: string
  places: Place[]
}

export const MapDisplay = ({ listId, searchId, places }: MapDisplayProps) => {
  const setPlaces = useMapStore((state) => state.setPlaces)
  const isMobile = useMediaQuery('(max-width: 768px)')

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

  // Update searchResults to use listData when available, fallback to mockData in development
  const [searchResults, setSearchResults] = useState<Place[]>(() => {
    if (places && places.length > 0) {
      return places
    }
    return process.env.NODE_ENV === 'development' ? [] : []
  })

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

  // Update effect to store places in Zustand
  useEffect(() => {
    if (places && places.length > 0) {
      setPlaces(places)
      setSearchResults(places)
      setTableData(places)
    }
  }, [places, setPlaces])

  if (listId && places && places.length === 0) {
    return <EmptyListState listId={listId} />
  }

  // On mobile, show only the DataTable
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <DataTable
          columns={columns}
          data={tableData}
          setData={setTableData}
          setDataTableRowSelection={setDataTableRowSelection}
          dataTableRowSelection={dataTableRowSelection}
          onFilteredDataChange={setFilteredPlaceIds}
          listId={listId}
          searchId={searchId}
        />
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
          <DataTable
            columns={columns}
            data={tableData}
            setData={setTableData}
            setDataTableRowSelection={setDataTableRowSelection}
            dataTableRowSelection={dataTableRowSelection}
            onFilteredDataChange={setFilteredPlaceIds}
            listId={listId}
            searchId={searchId}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={panelSizes[1]} className="flex-1">
          <MapBox
            searchResults={searchResults}
            userLocation={currentLocation}
            dataTableRowSelection={dataTableRowSelection}
            radiusInMeters={currentLocation.radiusInMeters}
            filteredPlaceIds={safeFilteredPlaceIds}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
