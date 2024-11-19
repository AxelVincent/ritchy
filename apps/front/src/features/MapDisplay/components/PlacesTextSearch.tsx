import { useTextSearch } from '@/api/queries/places/useTextSearch'
import type { PlacesSearchResponse } from '@ritchy/types/src/api/places.ts'
import { useEffect, useState } from 'react'

interface LocationParams {
  latitude: number
  longitude: number
  radiusInMeters: number
}

interface PlaceSearchProps {
  location: LocationParams
  onResultsChange: (results: PlacesSearchResponse) => void
}

export const PlaceSearch = ({
  location,
  onResultsChange
}: PlaceSearchProps) => {
  const [searchText, setSearchText] = useState('')
  const [resultsQuantity, setResultsQuantity] = useState(2)
  const [currentLocation, setCurrentLocation] =
    useState<LocationParams>(location)

  const { data, refetch } = useTextSearch({
    textQuery: searchText,
    resultsQuantity,
    locationBias: {
      circle: {
        center: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        },
        radiusInMeters: currentLocation.radiusInMeters
      }
    }
  })

  useEffect(() => {
    if (data) {
      onResultsChange(data)
    }
  }, [data, onResultsChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchText.length >= 3) {
      setCurrentLocation(location)
      await refetch()
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-shrink-0 p-4 border-b">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="search" className="text-sm font-medium">
              Search Places
            </label>
            <input
              id="search"
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Enter search terms..."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="results" className="text-sm font-medium">
              Number of Results
            </label>
            <input
              id="results"
              type="number"
              min={0}
              max={20}
              value={resultsQuantity}
              onChange={(e) =>
                setResultsQuantity(
                  Math.min(
                    20,
                    Math.max(0, Number.parseInt(e.target.value) || 0)
                  )
                )
              }
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Search
          </button>
        </form>
      </div>
    </div>
  )
}
