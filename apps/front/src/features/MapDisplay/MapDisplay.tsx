import { columns } from './components/data_table/Columns'
import { DataTable } from './components/data_table/DataTable'
import { MapBox } from './components/map_box/MapBox'
import { PlacesTextSearch } from './components/search_section/PlacesTextSearch'
import { DEFAULT_LOCATION } from './constants'

import { mockData } from '@/api/queries/places/mock/mockData'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { PlacesSearchResponse } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Location } from './types'

export const MapDisplay = () => {
  // Core location state
  const { location, error, loading } = useGeolocation(DEFAULT_LOCATION)
  const [currentLocation, setLocation] = useState<Location>(location)
  const [radiusInMeters, setRadiusInMeters] = useState(location.radiusInMeters)

  // Search and selection state
  const [searchResults, setSearchResults] = useState<PlacesSearchResponse>(
    process.env.NODE_ENV === 'development' ? mockData : [],
  )
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
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Detecting your location...</p>
        </div>
      </div>
    )
  }

  if (error) {
    console.warn('Geolocation error:', error)
  }

  return (
    <div className="flex flex-1">
      {/* Map Section */}
      <div className="w-1/2">
        {/* <div className={`${viewStyle.mapStyle.flex} relative h-full w-full`}> */}
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
        />
      </div>

      {/* Data Section */}
      <div className="w-1/2 flex-1 flex flex-col overflow-hidden">
        <PlacesTextSearch
          location={currentLocation}
          onResultsChange={setSearchResults}
          radiusInMeters={radiusInMeters}
          setRadiusInMeters={setRadiusInMeters}
        />
        <DataTable
          columns={columns}
          data={searchResults}
          onRowHover={setDataTableHoveredPlaceId}
          mapBoxSelectedPlaceId={mapBoxSelectedPlaceId}
          mapBoxHoveredPlaceId={mapBoxHoveredPlaceId}
          setDataTableRowSelection={setDataTableRowSelection}
          dataTableRowSelection={dataTableRowSelection}
        />
      </div>
    </div>
  )
}
