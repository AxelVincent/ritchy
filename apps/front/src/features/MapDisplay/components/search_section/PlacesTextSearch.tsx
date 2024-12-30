import { useTextSearch } from '@/api/queries/places/useTextSearch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import type { PlacesSearchResponse } from '@ritchy/types'
import { Search } from 'lucide-react'

import { RADIUS_SETTINGS } from '@/features/MapDisplay/types'
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
  radiusInMeters: number
  setRadiusInMeters: (radiusInMeters: number) => void
}

// TODO: Deprecate results quantity
// const MAX_RESULTS = 60
const DEFAULT_RESULTS_QUANTITY = 60

export const PlacesTextSearch = ({
  location,
  onResultsChange,
  radiusInMeters,
  setRadiusInMeters,
}: PlaceSearchProps) => {
  const [searchText, setSearchText] = useState('')
  // TODO: Deprecate results quantity
  // const [resultsQuantity, setResultsQuantity] = useState(
  //   DEFAULT_RESULTS_QUANTITY,
  // )
  const [currentLocation, setCurrentLocation] = useState<LocationParams>({
    ...location,
    radiusInMeters,
  })

  const { data, refetch, isLoading, isError } = useTextSearch({
    textQuery: searchText,
    resultsQuantity: DEFAULT_RESULTS_QUANTITY,
    locationBias: {
      circle: {
        center: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        radiusInMeters: currentLocation.radiusInMeters,
      },
    },
  })

  useEffect(() => {
    setCurrentLocation({
      ...location,
      radiusInMeters,
    })
  }, [location, radiusInMeters])

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

  const handleClear = () => {
    setSearchText('')
    onResultsChange([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear()
    }
  }

  // TODO: Deprecate results quantity
  // const handleQuantityChange = (value: string) => {
  //   const parsed = Number.parseInt(value) || 0
  //   setResultsQuantity(Math.min(MAX_RESULTS, Math.max(0, parsed)))
  // }

  return (
    <Card className="shadow-none border-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Search contacts</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-1.5 sm:space-y-2 w-full">
              <Label htmlFor="search">What are you looking for?</Label>
              <div className="relative">
                <Input
                  id="search"
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Restaurant, surf shop, cocktail bar, etc."
                  minLength={3}
                  required
                  className={isLoading ? 'pr-24' : 'pr-8'}
                  onKeyDown={handleKeyDown}
                />
                {searchText && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2"
                    onClick={handleClear}
                  >
                    ✕
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2 w-full">
              <Label
                htmlFor="radius-input"
                className="text-sm font-medium text-foreground"
              >
                Radius
              </Label>
              <div>
                <Label className="text-sm text-muted-foreground">
                  {radiusInMeters / 1000} km
                </Label>
                <Slider
                  id="radius-input"
                  min={RADIUS_SETTINGS.min}
                  max={RADIUS_SETTINGS.max}
                  step={RADIUS_SETTINGS.step}
                  value={[radiusInMeters]}
                  onValueChange={([newValue]) => setRadiusInMeters(newValue)}
                  aria-label="Radius"
                  className="cursor-pointer"
                />
              </div>
            </div>
            {/* TODO: Deprecate results quantity */}
            {/* <div className="space-y-1.5 sm:space-y-2 w-[100px]">
              <Label
                htmlFor="results"
                className="text-sm font-medium text-foreground"
              >
                Results
              </Label>
              <Input
                id="results"
                min={1}
                max={MAX_RESULTS}
                value={resultsQuantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
              />
            </div> */}
            <div className="flex items-end">
              <Button
                type="submit"
                variant="default"
                disabled={isLoading || searchText.length < 3}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  'Searching...'
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {isError && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-md">
            <p className="text-sm text-destructive">
              Failed to search places. Please check your connection and try
              again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
