import { DataTable } from './components/data_table/DataTable'
import { MapBox } from './components/map_box/MapBox'
import { PlacesTextSearch } from './components/search_section/PlacesTextSearch'
import { DEFAULT_LOCATION } from './constants'

import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ResizablePanelGroup } from '@/components/ui/resizable'
import { ResizableHandle } from '@/components/ui/resizable'
import { ResizablePanel } from '@/components/ui/resizable'
import { EmptyListState } from '@/features/lists/components/EmptyListState'
import { useGeolocation } from '@/hooks/useGeolocation'
import type {
  ListContentApiResponse,
  PlacesSearchResponse,
} from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { columns } from './components/data_table/Columns'
import type { Location } from './types'

interface MapDisplayProps {
  listId?: string
  listData?: ListContentApiResponse
}

export const MapDisplay = ({ listId, listData }: MapDisplayProps) => {
  // Core location state
  const defaultLocation =
    listId && listData && !('error' in listData) && listData.items.length > 0
      ? {
          latitude: listData.items[0].location.latitude,
          longitude: listData.items[0].location.longitude,
          radiusInMeters: DEFAULT_LOCATION.radiusInMeters,
        }
      : DEFAULT_LOCATION
  const { location, error, loading } = useGeolocation(defaultLocation, !!listId)
  const [currentLocation, setLocation] = useState<Location>(location)
  const [radiusInMeters, setRadiusInMeters] = useState(location.radiusInMeters)

  // Update searchResults to use listData when available, fallback to mockData in development
  const [searchResults, setSearchResults] = useState<PlacesSearchResponse>(
    () => {
      if (listId && listData && !('error' in listData)) {
        return listData.items
      }
      return process.env.NODE_ENV === 'development' ? [] : []
    },
  )

  // Add effect to update searchResults when listData changes
  useEffect(() => {
    if (listId && listData && !('error' in listData)) {
      setSearchResults(listData.items)
    }
  }, [listId, listData])

  // Search and selection state
  const [dataTableRowSelection, setDataTableRowSelection] =
    useState<RowSelectionState>({})
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [filteredPlaceIds, setFilteredPlaceIds] = useState<Set<string>>(
    () =>
      new Set(
        listId && listData && !('error' in listData)
          ? listData.items.map((item) => item.id)
          : searchResults.map((item) => item.id),
      ),
  )

  // Add a safety check to ensure we never pass undefined
  const safeFilteredPlaceIds = filteredPlaceIds ?? new Set<string>()

  // Effects
  useEffect(() => {
    if (location) {
      setLocation(location)
    }
  }, [location])

  useEffect(() => {
    console.log('filteredPlaceIds changed:', filteredPlaceIds)
  }, [filteredPlaceIds])

  if (loading) {
    return <LoadingSpinner message="Detecting your location..." />
  }

  if (error) {
    // console.warn('Geolocation error:', error)
  }

  if (
    listId &&
    listData &&
    !('error' in listData) &&
    listData.items.length === 0
  ) {
    return <EmptyListState listId={listId} />
  }

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel className="flex-1 flex flex-col overflow-hidden">
        {!listId && (
          <PlacesTextSearch
            location={currentLocation}
            onResultsChange={setSearchResults}
            radiusInMeters={radiusInMeters}
            setRadiusInMeters={setRadiusInMeters}
          />
        )}
        <DataTable
          columns={columns}
          data={searchResults}
          setSelectedPlaceId={setSelectedPlaceId}
          selectedPlaceId={selectedPlaceId}
          setDataTableRowSelection={setDataTableRowSelection}
          dataTableRowSelection={dataTableRowSelection}
          listId={listId}
          onFilteredDataChange={setFilteredPlaceIds}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className="flex-1">
        <MapBox
          onLocationChange={setLocation}
          searchResults={searchResults}
          selectedPlaceId={selectedPlaceId}
          setSelectedPlaceId={setSelectedPlaceId}
          userLocation={location}
          dataTableRowSelection={dataTableRowSelection}
          radiusInMeters={radiusInMeters}
          listId={listId}
          filteredPlaceIds={safeFilteredPlaceIds}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
