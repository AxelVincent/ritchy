import { DataTable } from '@/components/data-table/DataTable'
import { MapBox } from '@/features/map-display/components/map_box/MapBox'
import { DEFAULT_LOCATION } from '@/features/map-display/constants'

import { EmptyListState } from '@/components/lists/empty-list-state'
import { ResizablePanelGroup } from '@/components/ui/resizable'
import { ResizableHandle } from '@/components/ui/resizable'
import { ResizablePanel } from '@/components/ui/resizable'
import type { Place } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { columns } from '../../components/data-table/Columns'
import type { MapboxLocationParameters } from './types'

interface MapDisplayProps {
  listId?: string
  searchId?: string
  places: Place[]
}

export const MapDisplay = ({ listId, searchId, places }: MapDisplayProps) => {
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

  // Update searchResults to use listData when available, fallback to mockData in development
  const [searchResults, setSearchResults] = useState<Place[]>(() => {
    if (places && places.length > 0) {
      return places
    }
    return process.env.NODE_ENV === 'development' ? [] : []
  })

  // Add effect to update searchResults when listData changes
  useEffect(() => {
    if (places && places.length > 0) {
      setSearchResults(places)
    }
  }, [places])

  // Search and selection state
  const [dataTableRowSelection, setDataTableRowSelection] =
    useState<RowSelectionState>({})
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
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

  // Update effect to handle places changes
  useEffect(() => {
    setTableData(places)
  }, [places])

  if (listId && places && places.length === 0) {
    return <EmptyListState listId={listId} />
  }

  return (
    <div className="flex flex-col h-full">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel className="flex-1 flex flex-col overflow-hidden">
          <DataTable
            columns={columns}
            data={tableData}
            setData={setTableData}
            setSelectedPlaceId={setSelectedPlaceId}
            selectedPlaceId={selectedPlaceId}
            setDataTableRowSelection={setDataTableRowSelection}
            dataTableRowSelection={dataTableRowSelection}
            onFilteredDataChange={setFilteredPlaceIds}
            listId={listId}
            searchId={searchId}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel className="flex-1">
          <MapBox
            onLocationChange={(location) => {
              setLocation({
                ...location,
              })
            }}
            searchResults={searchResults}
            selectedPlaceId={selectedPlaceId}
            setSelectedPlaceId={setSelectedPlaceId}
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
