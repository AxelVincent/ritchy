import { DataTable } from '@/features/map-display/components/data_table/DataTable'
import { MapBox } from '@/features/map-display/components/map_box/MapBox'
import { DEFAULT_LOCATION } from '@/features/map-display/constants'

import { ResizablePanelGroup } from '@/components/ui/resizable'
import { ResizableHandle } from '@/components/ui/resizable'
import { ResizablePanel } from '@/components/ui/resizable'
import { EmptyListState } from '@/features/lists/components/EmptyListState'
import type { Place } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { columns } from './components/data_table/Columns'
import type { MapboxLocationParameters } from './types'

interface MapDisplayProps {
  isSearch: boolean
  listId?: string
  places: Place[]
}

export const MapDisplay = ({ isSearch, listId, places }: MapDisplayProps) => {
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
  // const [radiusInMeters, setRadiusInMeters] = useState(
  //   defaultLocation.radiusInMeters,
  // )

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

  if (listId && places && places.length === 0) {
    return <EmptyListState listId={listId} />
  }

  return (
    <div className="flex flex-col h-full">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel className="flex-1 flex flex-col overflow-hidden">
          <DataTable
            columns={columns}
            data={searchResults}
            setSelectedPlaceId={setSelectedPlaceId}
            selectedPlaceId={selectedPlaceId}
            setDataTableRowSelection={setDataTableRowSelection}
            dataTableRowSelection={dataTableRowSelection}
            onFilteredDataChange={setFilteredPlaceIds}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel className="flex-1">
          <MapBox
            isSearch={isSearch}
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
