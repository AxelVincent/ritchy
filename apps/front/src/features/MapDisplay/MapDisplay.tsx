import type { PlacesSearchResponse } from '@ritchy/types/src/api/places.ts'
import { useState } from 'react'
import { MapBox } from './components/MapBox'
import { PlaceSearch } from './components/PlacesTextSearch'

export const MapDisplay = () => {
  const [location, setLocation] = useState({
    latitude: 43.6568,
    longitude: -79.4512,
    radiusInMeters: 1000
  })

  const [searchResults, setSearchResults] =
    useState<PlacesSearchResponse | null>(null)

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
        />
      </div>
      <div className="w-1/2">
        <PlaceSearch location={location} onResultsChange={handleResults} />
      </div>
    </div>
  )
}
