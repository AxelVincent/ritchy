import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Search } from 'lucide-react'
import { useRef } from 'react'

import type { Location } from '@/components/search/search-map'
import type { GeocodeLocation } from '@ritchy/types'
import { PlacesKeywordSearch } from './search-options/places-keyword-search'
import { PlacesUniqueSearch } from './search-options/places-unique-search'

type SearchMode = 'keyword' | 'unique'

interface SearchOptionsProps {
  location: Location
  className?: string
  updateSearchParams: (
    updates: Partial<{
      mode: 'keyword' | 'unique'
      keyword: string
      placeName: string
      model: 'BASIC' | 'ENHANCED'
      northEastLat: number
      northEastLng: number
      southWestLat: number
      southWestLng: number
      lng: number
    }>,
  ) => void
  onPlaceSelect: (place: GeocodeLocation) => void
  selectedPlace: GeocodeLocation | null
  setSelectedPlace: (place: GeocodeLocation | null) => void
  searchMode: SearchMode
  onLocationChange: (location: Location) => void
}

export const SearchOptions = ({
  location,
  updateSearchParams,
  onPlaceSelect,
  selectedPlace,
  setSelectedPlace,
  searchMode,
  onLocationChange,
}: SearchOptionsProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleSearchModeChange = (mode: SearchMode) => {
    // Clear selected place when switching modes
    setSelectedPlace(null)
    updateSearchParams({ mode })
  }

  const renderSearchModeSelector = () => {
    return (
      <div className="mb-4">
        <div className="flex gap-2">
          <Button
            variant={searchMode === 'keyword' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSearchModeChange('keyword')}
            className="flex-1"
          >
            <Search className="h-4 w-4 mr-2" />
            Keyword Search
          </Button>
          <Button
            variant={searchMode === 'unique' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSearchModeChange('unique')}
            className="flex-1"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Unique Search
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {searchMode === 'keyword'
            ? 'Search for multiple places with keywords'
            : 'Find and add a specific place directly'}
        </p>
      </div>
    )
  }

  const renderSearchContent = () => {
    if (searchMode === 'keyword') {
      return (
        <PlacesKeywordSearch
          location={location}
          updateSearchParams={updateSearchParams}
          onLocationChange={onLocationChange}
        />
      )
    }

    return (
      <PlacesUniqueSearch
        location={location}
        updateSearchParams={updateSearchParams}
        onLocationChange={onLocationChange}
        onPlaceSelect={onPlaceSelect}
        selectedPlace={selectedPlace}
        setSelectedPlace={setSelectedPlace}
      />
    )
  }

  return (
    <div
      className="absolute top-4 left-1/2 md:left-4 -translate-x-1/2 md:-translate-x-0 z-10"
      ref={containerRef}
    >
      <Card className="max-w-sm w-[calc(100vw-120px)]">
        <CardContent className="p-4">
          {renderSearchModeSelector()}
          {renderSearchContent()}
        </CardContent>
      </Card>
    </div>
  )
}
