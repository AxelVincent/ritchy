import { columns } from './components/data_table/Columns'
import { DataTable } from './components/data_table/DataTable'
import { MapBox } from './components/map_box/MapBox'
import { PlacesTextSearch } from './components/search_section/PlacesTextSearch'
import { DEFAULT_LOCATION } from './constants'

import { mockData } from '@/api/queries/places/mock/mockData'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ResizablePanelGroup } from '@/components/ui/resizable'
import { ResizableHandle } from '@/components/ui/resizable'
import { ResizablePanel } from '@/components/ui/resizable'
import { useGeolocation } from '@/hooks/useGeolocation'
import type {
  ListContentApiResponse,
  PlacesSearchResponse,
} from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
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
      return process.env.NODE_ENV === 'development' ? mockData : []
    },
  )

  // Add effect to update searchResults when listData changes
  useEffect(() => {
    if (listId && listData && !('error' in listData)) {
      setSearchResults(listData.items)
    }
  }, [listId, listData])

  // Search and selection state
  const [dataTableHoveredPlaceId, setDataTableHoveredPlaceId] = useState<
    string | null
  >(null)
  const [mapBoxHoveredPlaceId, setMapBoxHoveredPlaceId] = useState<
    string | null
  >(null)
  const [mapBoxSelectedPlaceId, setMapBoxSelectedPlaceId] = useState<
    string | null
  >(null)
  const [dataTableRowSelection, setDataTableRowSelection] =
    useState<RowSelectionState>({})

  // Effects
  useEffect(() => {
    if (location) {
      setLocation(location)
    }
  }, [location])

  if (loading) {
    return <LoadingSpinner message="Detecting your location..." />
  }

  if (error) {
    console.warn('Geolocation error:', error)
  }

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel className="flex-1">
        <MapBox
          onLocationChange={setLocation}
          searchResults={searchResults}
          dataTableHoveredPlaceId={dataTableHoveredPlaceId}
          setMapBoxSelectedPlaceId={setMapBoxSelectedPlaceId}
          setMapBoxHoveredPlaceId={setMapBoxHoveredPlaceId}
          userLocation={location}
          dataTableRowSelection={dataTableRowSelection}
          radiusInMeters={radiusInMeters}
          setRadiusInMeters={setRadiusInMeters}
          listId={listId}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
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
          onRowHover={setDataTableHoveredPlaceId}
          mapBoxSelectedPlaceId={mapBoxSelectedPlaceId}
          mapBoxHoveredPlaceId={mapBoxHoveredPlaceId}
          setDataTableRowSelection={setDataTableRowSelection}
          dataTableRowSelection={dataTableRowSelection}
          listId={listId}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
