import { Button } from '@/components/ui/button'
import { columns } from '@/features/MapDisplay/components/data_table/Columns'
import { DataTable } from '@/features/MapDisplay/components/data_table/DataTable'
import { MapBox } from '@/features/MapDisplay/components/map_box/MapBox'
import { PlacesTextSearch } from '@/features/MapDisplay/components/search_section/PlacesTextSearch'
import type { Location } from '@/features/MapDisplay/types'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { PlacesSearchResponse } from '@ritchy/types'
import {
  Columns2,
  Loader2,
  Map as MapIcon,
  TableProperties,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const DEFAULT_LOCATION: Location = {
  latitude: 48.8566,
  longitude: 2.3522,
  radiusInMeters: 3000,
}

export const MapDisplay = () => {
  const { location, error, loading } = useGeolocation(DEFAULT_LOCATION)

  const [currentLocation, setLocation] = useState<Location>(location)

  const [searchResults, setSearchResults] = useState<PlacesSearchResponse>([])

  const [dataTableHoveredPlaceId, setDataTableHoveredPlaceId] = useState<
    string | null
  >(null)
  const [mapBoxHoveredPlaceId, setMapBoxHoveredPlaceId] = useState<
    string | null
  >(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)

  const [viewStyle, setViewStyle] = useState<{
    mapStyle: { flex: string }
    dataStyle: { flex: string }
  }>({
    mapStyle: { flex: 'flex-1' },
    dataStyle: { flex: 'flex-1' },
  })

  const [viewMode, setViewMode] = useState<'map' | 'data' | 'equal'>('equal')

  const handleResults = (results: PlacesSearchResponse) => {
    setSearchResults(results)
  }

  const toggleViewMode = (mode: 'map' | 'data' | 'equal') => {
    setViewMode(mode)

    // Create an object to define sizes based on the current view mode
    const sizes = (() => {
      switch (mode) {
        case 'map':
          return { mapSize: 'basis-2/3', dataSize: 'basis-1/3' }
        case 'data':
          return { mapSize: 'basis-1/3', dataSize: 'basis-2/3' }
        case 'equal':
          return { mapSize: 'basis-1/2', dataSize: 'basis-1/2' }
        default:
          return { mapSize: 'basis-1/2', dataSize: 'basis-1/2' } // Fallback
      }
    })()

    setViewStyle({
      mapStyle: { flex: sizes.mapSize },
      dataStyle: { flex: sizes.dataSize },
    })
  }

  // Update currentLocation when geolocation is available
  useEffect(() => {
    if (location) {
      setLocation(location)
    }
  }, [location])

  // Optionally show loading or error states
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
    // Continue with default location
  }

  return (
    <div className="flex flex-row h-full w-full overflow-hidden">
      <div className={`${viewStyle.mapStyle.flex} relative h-full w-full`}>
        <MapBox
          onLocationChange={setLocation}
          searchResults={searchResults}
          dataTableHoveredPlaceId={dataTableHoveredPlaceId}
          setSelectedPlaceId={setSelectedPlaceId}
          viewMode={viewMode}
          setMapBoxHoveredPlaceId={setMapBoxHoveredPlaceId}
          userLocation={location}
        />
        <div className="absolute bottom-4 right-0 translate-x-1/2 flex flex-row space-x-2 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={() => toggleViewMode('map')}
          >
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
      </div>
      <div
        className={`${viewStyle.dataStyle.flex} flex flex-col h-full w-full overflow-hidden border-l`}
      >
        <PlacesTextSearch
          location={currentLocation}
          onResultsChange={handleResults}
        />
        <DataTable
          columns={columns}
          data={searchResults}
          onRowHover={setDataTableHoveredPlaceId}
          selectedPlaceId={selectedPlaceId}
          mapBoxHoveredPlaceId={mapBoxHoveredPlaceId}
        />
      </div>
    </div>
  )
}
