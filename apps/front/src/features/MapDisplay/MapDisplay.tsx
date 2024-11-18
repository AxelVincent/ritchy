import type { PlacesSearchResponse } from '@ritchy/types/src/api/places.ts'
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

  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)

  const handleResults = (results: PlacesSearchResponse) => {
    setSearchResults(results)
  }

  return (
    <div className="relative h-screen w-screen flex">
      <div className="w-1/2">
        <MapBox
          onLocationChange={setLocation}
          searchResults={searchResults}
          hoveredPlaceId={hoveredPlaceId}
          setSelectedPlaceId={setSelectedPlaceId}
        />
      </div>
      <div className="w-1/2">
        <div className="h-[25%]">
          <PlaceSearch location={location} onResultsChange={handleResults} />
        </div>
        <div className="h-[75%]">
          <DataTable
            columns={columns}
            data={searchResults}
            hoveredPlaceId={hoveredPlaceId}
            onRowHover={setHoveredPlaceId}
            selectedPlaceId={selectedPlaceId}
          />
        </div>
      </div>
    </div>
  )
}
