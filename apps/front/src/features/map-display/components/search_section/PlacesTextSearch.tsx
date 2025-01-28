import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Search } from 'lucide-react'

import { LocationAutocomplete } from '@/components/mapbox/LocationAutocomplete'
import { RADIUS_SETTINGS } from '@/features/map-display/types'
import type { CreateSearchRequestBody, GeocodingResult } from '@ritchy/types'
import { useEffect, useState } from 'react'

interface LocationParams {
  latitude: number
  longitude: number
  radiusInMeters: number
}

interface PlaceSearchProps {
  location: LocationParams
  onSearch: (params: CreateSearchRequestBody) => void
  className?: string
  radiusInMeters: number
  setRadiusInMeters: (radiusInMeters: number) => void
  onLocationChange?: (location: LocationParams) => void
}

export const PlacesTextSearch = ({
  location,
  onSearch,
  radiusInMeters,
  setRadiusInMeters,
  onLocationChange,
}: PlaceSearchProps) => {
  const [searchText, setSearchText] = useState('')
  const [model, setModel] = useState<
    'DEFAULT' | 'NAVIGATOR' | 'EXPLORER' | 'PRO'
  >('DEFAULT')
  const [currentLocation, setCurrentLocation] = useState<LocationParams>({
    ...location,
    radiusInMeters,
  })

  useEffect(() => {
    setCurrentLocation({
      ...location,
      radiusInMeters,
    })
  }, [location, radiusInMeters])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchText.length < 3) {
      return
    }

    onSearch({
      location: {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      },
      radiusInMeters: currentLocation.radiusInMeters,
      placeName: searchText,
      keyword: searchText,
      model,
    })
  }

  const handleClear = () => {
    setSearchText('')
    onSearch({
      location: {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      },
      radiusInMeters: currentLocation.radiusInMeters,
      placeName: '',
      keyword: '',
      model,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear()
    }
  }

  const handleLocationSelect = (newLocation: GeocodingResult) => {
    setCurrentLocation({
      latitude: newLocation.center[1],
      longitude: newLocation.center[0],
      radiusInMeters: 1000,
    })
    onLocationChange?.({
      latitude: newLocation.center[1],
      longitude: newLocation.center[0],
      radiusInMeters: 1000,
    })
  }

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="space-y-1.5 sm:space-y-2 w-full">
            <Label htmlFor="location-input">Where are you searching?</Label>
            <LocationAutocomplete onLocationSelect={handleLocationSelect} />
          </div>
          <div className="space-y-1.5 mb-1 sm:space-y-2 w-full">
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
                className={searchText ? 'pr-8' : ''}
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
          <div className="space-y-1.5 mb-1 sm:space-y-2 w-full">
            <div className="flex justify-between">
              <Label
                htmlFor="radius-input"
                className="text-sm font-medium text-foreground"
              >
                Research area
              </Label>
              <Label className="text-sm text-muted-foreground">
                {radiusInMeters / 1000} km
              </Label>
            </div>
            <div>
              <Slider
                id="radius-input"
                min={RADIUS_SETTINGS.min}
                max={RADIUS_SETTINGS.max}
                step={RADIUS_SETTINGS.step}
                value={[radiusInMeters]}
                onValueChange={([newValue]) => setRadiusInMeters(newValue)}
                aria-label="Radius"
                className="cursor-pointer h-[32.4px]"
              />
            </div>
          </div>
          <div className="space-y-1.5 mb-1 sm:space-y-2 w-[100px]">
            <Label htmlFor="model-select">Pricing model</Label>
            <Select
              value={model}
              onValueChange={(value: typeof model) => setModel(value)}
            >
              <SelectTrigger id="model-select" className="w-[100px]">
                <SelectValue placeholder="Select a model">
                  {model === 'DEFAULT' && 'Default'}
                  {model === 'NAVIGATOR' && 'Navigator'}
                  {model === 'EXPLORER' && 'Explorer'}
                  {model === 'PRO' && 'Pro'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFAULT">
                  <div className="space-y-1">
                    <div>Default</div>
                    <div className="text-xs text-muted-foreground">
                      Basic search with up to 60 results
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="NAVIGATOR">
                  <div className="space-y-1">
                    <div>Navigator</div>
                    <div className="text-xs text-muted-foreground">
                      Enhanced search with up to 240 results
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="EXPLORER">
                  <div className="space-y-1">
                    <div>Explorer</div>
                    <div className="text-xs text-muted-foreground">
                      Advanced search with up to 960 results
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="PRO">
                  <div className="space-y-1">
                    <div>Pro</div>
                    <div className="text-xs text-muted-foreground">
                      Premium search with up to 3840 results
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Button
              type="submit"
              variant="default"
              disabled={searchText.length < 3}
              className="w-full sm:w-auto mb-1"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
