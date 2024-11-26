import { useTextSearch } from '@/api/queries/places/useTextSearch'
import { cn } from '@/lib/utils'
import type { PlacesSearchResponse } from '@ritchy/types'
import { useEffect, useState } from 'react'

interface LocationParams {
  latitude: number
  longitude: number
  radiusInMeters: number
}

interface PlaceSearchProps {
  location: LocationParams
  onResultsChange: (results: PlacesSearchResponse) => void
  className?: string
}

export const PlacesTextSearch = ({
  location,
  onResultsChange,
  className
}: PlaceSearchProps) => {
  const [searchText, setSearchText] = useState('')
  const [resultsQuantity, setResultsQuantity] = useState(5)
  const [currentLocation, setCurrentLocation] =
    useState<LocationParams>(location)

  const { data, refetch, isLoading, isError } = useTextSearch({
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
    setCurrentLocation(location)
  }, [location])

  useEffect(() => {
    if (data) {
      onResultsChange(data)
    }
  }, [data, onResultsChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchText.length < 3) {
      return
    }
    await refetch()
  }

  const handleQuantityChange = (value: string) => {
    const parsed = Number.parseInt(value) || 0
    setResultsQuantity(Math.min(20, Math.max(0, parsed)))
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex-shrink-0 p-2 sm:p-4 border-b">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 gap-3 sm:gap-4">
            <div className="col-span-3 space-y-1.5 sm:space-y-2">
              <label
                htmlFor="search"
                className="text-sm font-medium text-foreground"
              >
                What are you looking for?
              </label>
              <input
                id="search"
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full rounded-md border px-2 sm:px-3 py-1.5 sm:py-2 bg-background text-foreground text-sm sm:text-base"
                placeholder="Enter at least 3 characters..."
                minLength={3}
                required
              />
            </div>

            <div className="col-span-1 space-y-1.5 sm:space-y-2">
              <label
                htmlFor="results"
                className="text-sm font-medium text-foreground"
              >
                Results
              </label>
              <input
                id="results"
                type="number"
                min={1}
                max={20}
                value={resultsQuantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="w-full rounded-md border px-2 sm:px-3 py-1.5 sm:py-2 bg-background text-foreground text-sm sm:text-base"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || searchText.length < 3}
            className={cn(
              'w-full rounded-md px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-white transition-colors',
              'bg-primary hover:bg-primary/90 disabled:bg-primary/50'
            )}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {isError && (
          <p className="mt-2 text-sm text-destructive">
            Failed to search places. Please try again.
          </p>
        )}
      </div>
    </div>
  )
}
