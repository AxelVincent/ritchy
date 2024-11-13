import { useTextSearch } from '@/api/queries/googleMaps/useTextSearch'
import type { TextSearchResponse } from '@ritchy/types/src/places.js'
import { useEffect, useState } from 'react'

interface LocationParams {
  latitude: number
  longitude: number
  radiusInMeters: number
}

interface PlaceSearchProps {
  location: LocationParams
  onResultsChange: (results: TextSearchResponse) => void
}

export const PlaceSearch = ({
  location,
  onResultsChange
}: PlaceSearchProps) => {
  const [searchText, setSearchText] = useState('')
  const [pageSize, setPageSize] = useState(2)
  const [currentLocation, setCurrentLocation] =
    useState<LocationParams>(location)

  const { data, isLoading, refetch } = useTextSearch({
    query: searchText,
    pageSize,
    location: currentLocation
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
    <div className="flex flex-col h-full">
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
              value={pageSize}
              onChange={(e) =>
                setPageSize(
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

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && <div>Searching...</div>}

        {data && (
          <div>
            <h3 className="text-lg font-medium mb-2">Results</h3>
            <div className="space-y-2">
              {data.places?.map((place) => (
                <div
                  key={place.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-lg">
                        {place.displayName.text}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {place.shortFormattedAddress}
                      </p>
                    </div>
                    {place.rating && (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md font-medium">
                          {place.rating.toFixed(1)} ★
                        </span>
                        {place.userRatingCount && (
                          <span className="text-sm text-gray-500">
                            ({place.userRatingCount})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {place.types.map((type) => (
                      <span
                        key={type}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {type.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-2">
                    {place.websiteUri && (
                      <a
                        href={place.websiteUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Website
                      </a>
                    )}
                    <a
                      href={place.googleMapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View on Maps
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
