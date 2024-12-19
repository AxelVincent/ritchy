import { Button } from '@/components/ui/button'
import { columns } from './components/data_table/Columns'
import { DataTable } from './components/data_table/DataTable'
import { MapBox } from './components/map_box/MapBox'
import { PlacesTextSearch } from './components/search_section/PlacesTextSearch'
import { DEFAULT_LOCATION } from './constants'

import { useGeolocation } from '@/hooks/useGeolocation'
import type { PlacesSearchResponse } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import {
  Columns2,
  Loader2,
  Map as MapIcon,
  TableProperties,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useViewMode } from './hooks/useViewMode'
import type { Location, ViewMode } from './types'

export const MapDisplay = () => {
  // Core location state
  const { location, error, loading } = useGeolocation(DEFAULT_LOCATION)
  const [currentLocation, setLocation] = useState<Location>(location)
  const [radiusInMeters, setRadiusInMeters] = useState(location.radiusInMeters)

  // Search and selection state
  const [searchResults, setSearchResults] = useState<PlacesSearchResponse>([])
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

  useEffect(() => {
    console.log(dataTableRowSelection)
  }, [dataTableRowSelection])

  // View management
  const { viewMode, viewStyle, toggleViewMode } = useViewMode()

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
    <div className="flex flex-row h-full w-full overflow-hidden">
      {/* Map Section */}
      <div className={`${viewStyle.mapStyle.flex} relative h-full w-full`}>
        <MapBox
          onLocationChange={setLocation}
          searchResults={searchResults}
          dataTableHoveredPlaceId={dataTableHoveredPlaceId}
          setMapBoxSelectedPlaceId={setMapBoxSelectedPlaceId}
          viewMode={viewMode}
          setMapBoxHoveredPlaceId={setMapBoxHoveredPlaceId}
          userLocation={location}
          dataTableRowSelection={dataTableRowSelection}
          radiusInMeters={radiusInMeters}
          setRadiusInMeters={setRadiusInMeters}
        />
        <ViewModeControls toggleViewMode={toggleViewMode} />
      </div>

      {/* Data Section */}
      <div
        className={`${viewStyle.dataStyle.flex} flex flex-col h-full w-full overflow-hidden border-l`}
      >
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

// View mode controls component
const ViewModeControls = ({
  toggleViewMode,
}: { toggleViewMode: (mode: ViewMode) => void }) => (
  <div className="absolute bottom-4 right-0 translate-x-1/2 flex flex-row space-x-2 z-50">
    <Button variant="outline" size="icon" onClick={() => toggleViewMode('map')}>
      <MapIcon />
    </Button>
    <Button
      variant="outline"
      size="icon"
      onClick={() => toggleViewMode('equal')}
    >
      <Columns2 />
    </Button>
    <Button
      variant="outline"
      size="icon"
      onClick={() => toggleViewMode('data')}
    >
      <TableProperties />
    </Button>
  </div>
)
