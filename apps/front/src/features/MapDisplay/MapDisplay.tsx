import type { TextSearchResponse } from '@ritchy/types/src/places.js'
import { useState } from 'react'
import { MapBox } from './components/MapBox'
import { PlaceSearch } from './components/PlacesTextSearch'

export const MapDisplay = () => {
  const [location, setLocation] = useState({
    latitude: 43.6568,
    longitude: -79.4512,
    radius: 1000
  })

  const [searchResults, setSearchResults] = useState<TextSearchResponse | null>(
    null
  )

  const handleResults = (results: TextSearchResponse) => {
    setSearchResults(results)
  }

  return (
    <div className="relative h-screen w-screen flex">
      <div className="w-1/2">
        <MapBox
          onLocationChange={setLocation}
          initialRadius={location.radius}
          searchResults={searchResults}
        />
      </div>
      <div className="w-1/2">
        <PlaceSearch location={location} onResultsChange={handleResults} />
      </div>
    </div>
  )
}
