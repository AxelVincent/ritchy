import type { PlacesSearchResponse } from '@ritchy/types/src/api/places.ts'
import { useState } from 'react'
import { columns } from './components/Columns'
import { DataTable } from './components/DataTable'
import { MapBox } from './components/MapBox'
import { PlaceSearch } from './components/PlacesTextSearch'

export const MapDisplay = () => {
  const [location, setLocation] = useState({
    latitude: 43.6568,
    longitude: -79.4512,
    radiusInMeters: 1000
  })

  const [searchResults, setSearchResults] = useState<PlacesSearchResponse>([])

  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null)

  const handleResults = (results: PlacesSearchResponse) => {
    setSearchResults(results)
  }

  return (
    <div className="relative h-screen w-screen flex">
      <div className="w-1/2">
        <MapBox
          onLocationChange={setLocation}
          initialRadiusInMeters={location.radiusInMeters}
          searchResults={searchResults}
          hoveredPlaceId={hoveredPlaceId}
          onMarkerHover={setHoveredPlaceId}
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
          />
        </div>
      </div>
    </div>
  )
}
