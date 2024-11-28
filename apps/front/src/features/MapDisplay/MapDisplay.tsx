import type { PlacesSearchResponse } from '@ritchy/types'
import { Columns2, Map as MapIcon, TableProperties } from 'lucide-react'
import { useState } from 'react'
import { columns } from './components/Columns'
import { DataTable } from './components/DataTable'
import { MapBox } from './components/MapBox'
import { PlacesTextSearch } from './components/PlacesTextSearch'

interface Location {
  latitude: number
  longitude: number
  radiusInMeters: number
}

export const DEFAULT_LOCATION: Location = {
  latitude: 48.8566,
  longitude: 2.3522,
  radiusInMeters: 1000
}

export const MapDisplay = () => {
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION)

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
    dataStyle: { flex: 'flex-1' }
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
      dataStyle: { flex: sizes.dataSize }
    })
  }

  return (
    <>
      <div className={`${viewStyle.mapStyle.flex} relative h-full w-full`}>
        <MapBox
          onLocationChange={setLocation}
          searchResults={searchResults}
          dataTableHoveredPlaceId={dataTableHoveredPlaceId}
          setSelectedPlaceId={setSelectedPlaceId}
          viewMode={viewMode}
          setMapBoxHoveredPlaceId={setMapBoxHoveredPlaceId}
        />
        <div className="absolute bottom-4 right-0 translate-x-1/2 flex flex-row space-x-2">
          <button
            type="button"
            onClick={() => toggleViewMode('map')}
            className={`p-2 rounded ${
              viewMode === 'map' ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
          >
            <MapIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => toggleViewMode('equal')}
            className={`p-2 rounded ${
              viewMode === 'equal' ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
          >
            <Columns2 className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => toggleViewMode('data')}
            className={`p-2 rounded ${
              viewMode === 'data' ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
          >
            <TableProperties className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={`${viewStyle.dataStyle.flex} overflow-hidden`}>
        <PlacesTextSearch location={location} onResultsChange={handleResults} />
        <DataTable
          columns={columns}
          data={searchResults}
          onRowHover={setDataTableHoveredPlaceId}
          selectedPlaceId={selectedPlaceId}
          mapBoxHoveredPlaceId={mapBoxHoveredPlaceId}
        />
      </div>
    </>
  )
}
