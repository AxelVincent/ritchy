import type { PlacesSearchResponse } from '@ritchy/types/src/api/places.ts'
import { Columns2, Map as MapIcon, TableProperties } from 'lucide-react'
import { useState } from 'react'
import { columns } from './components/Columns'
import { DataTable } from './components/DataTable'
import { MapBox } from './components/MapBox'
import { PlaceSearch } from './components/PlacesTextSearch'

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
    mapStyle: object
    dataStyle: object
  }>({
    mapStyle: { width: '50%', height: '100%' },
    dataStyle: { width: '50%', height: '100%' }
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
          return { mapSize: 75, dataSize: 25 }
        case 'data':
          return { mapSize: 25, dataSize: 75 }
        case 'equal':
          return { mapSize: 50, dataSize: 50 }
        default:
          return { mapSize: 50, dataSize: 50 } // Fallback
      }
    })()

    setViewStyle({
      mapStyle: { width: `${sizes.mapSize}%`, height: '100%' },
      dataStyle: { width: `${sizes.dataSize}%`, height: '100%' }
    })
  }

  return (
    <div className="relative h-screen w-screen flex">
      <div style={viewStyle.mapStyle}>
        <MapBox
          onLocationChange={setLocation}
          searchResults={searchResults}
          dataTableHoveredPlaceId={dataTableHoveredPlaceId}
          setSelectedPlaceId={setSelectedPlaceId}
          viewMode={viewMode}
          setMapBoxHoveredPlaceId={setMapBoxHoveredPlaceId}
        />
      </div>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 p-2 bg-white rounded shadow-md flex flex-row space-x-2">
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
      <div style={viewStyle.dataStyle}>
        <div className="h-[25%]">
          <PlaceSearch location={location} onResultsChange={handleResults} />
        </div>
        <div className="h-[75%]">
          <DataTable
            columns={columns}
            data={searchResults}
            onRowHover={setDataTableHoveredPlaceId}
            selectedPlaceId={selectedPlaceId}
            mapBoxHoveredPlaceId={mapBoxHoveredPlaceId}
          />
        </div>
      </div>
    </div>
  )
}
