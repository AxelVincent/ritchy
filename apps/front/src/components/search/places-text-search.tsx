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
import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'

import { useUserSubscription } from '@/api/queries/users/useUserSubscription'
import { LocationAutocomplete } from '@/components/mapbox/location-autocomplete'
import { RADIUS_SETTINGS } from '@/features/map-display/types'
import { isModelAvailable } from '@/lib/subscription'
import {
  type CreateSearchRequestBody,
  type GeocodingResult,
  PLAN_RADIUS_LIMITS,
  type SearchModel,
} from '@ritchy/types'
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
  const navigate = useNavigate()
  const { data: subscription } = useUserSubscription()
  const [searchText, setSearchText] = useState('')
  const [placeName, setPlaceName] = useState('')
  const [model, setModel] = useState<SearchModel>('ESSENTIALS')
  const [currentLocation, setCurrentLocation] =
    useState<LocationParams>(location)

  useEffect(() => {
    setCurrentLocation({
      ...location,
      radiusInMeters,
    })
  }, [location, radiusInMeters])

  const getMaxRadius = () => {
    const userPlan = subscription?.plan ?? 'FREE'
    return PLAN_RADIUS_LIMITS[userPlan]
  }

  const getNextTierRadius = () => {
    const userPlan = subscription?.plan ?? 'FREE'
    switch (userPlan) {
      case 'FREE':
      case 'NAVIGATOR':
        return PLAN_RADIUS_LIMITS.EXPLORER
      case 'EXPLORER':
        return PLAN_RADIUS_LIMITS.PRO
      default:
        return null
    }
  }

  const isNearPlanLimit = () => {
    const currentMax = getMaxRadius()
    return radiusInMeters >= currentMax * 0.9 // Show upsell when within 90% of limit
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchText.length < 3) {
      return
    }

    const searchParams: CreateSearchRequestBody = {
      location: {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      },
      radiusInMeters: currentLocation.radiusInMeters,
      placeName: placeName,
      keyword: searchText,
      model,
    }

    onSearch(searchParams)
  }

  const handleClear = () => {
    setSearchText('')
    onSearch({
      location: {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      },
      radiusInMeters: currentLocation.radiusInMeters,
      placeName: placeName,
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
    const updatedLocation = {
      latitude: newLocation.center[1],
      longitude: newLocation.center[0],
      radiusInMeters,
    }

    setCurrentLocation(updatedLocation)
    onLocationChange?.(updatedLocation)
    setPlaceName(newLocation.place_name)
  }

  const handleModelChange = (value: typeof model) => {
    if (!isModelAvailable(subscription?.plan, value)) {
      navigate({ to: '/pricing' })
      return
    }

    setModel(value)
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
            <div className="flex justify-between">
              <Label
                htmlFor="radius-input"
                className="text-sm font-medium text-foreground"
              >
                Research area
              </Label>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">
                  {radiusInMeters / 1000} km
                </Label>
                {isNearPlanLimit() && getNextTierRadius() && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary font-medium"
                    onClick={() => navigate({ to: '/pricing' })}
                  >
                    Upgrade for {(getNextTierRadius() ?? 0) / 1000} km
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Slider
                id="radius-input"
                min={RADIUS_SETTINGS.min}
                max={getMaxRadius()}
                step={RADIUS_SETTINGS.step}
                value={[radiusInMeters]}
                onValueChange={([newValue]) => setRadiusInMeters(newValue)}
                aria-label="Radius"
                className="cursor-pointer h-[32.4px]"
              />
            </div>
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
          <div className="space-y-1.5 mb-1 sm:space-y-2 w-[100px]">
            <Label htmlFor="model-select">Search power</Label>
            <Select value={model} onValueChange={handleModelChange}>
              <SelectTrigger id="model-select" className="w-[100px]">
                <SelectValue placeholder="Select a model">
                  {model === 'ESSENTIALS' && 'Essentials'}
                  {model === 'NAVIGATOR' && 'Navigator'}
                  {model === 'EXPLORER' && 'Explorer'}
                  {model === 'PRO' && 'Pro'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ESSENTIALS" className="cursor-pointer">
                  <div className="space-y-1 w-full">
                    <div>Essentials</div>
                    <div className="text-xs text-muted-foreground">
                      Basic search with up to 60 results
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="NAVIGATOR" className="cursor-pointer">
                  <div className="space-y-1 w-full">
                    <div className="flex items-center w-full">
                      <span
                        className={
                          !isModelAvailable(subscription?.plan, 'NAVIGATOR')
                            ? 'text-muted-foreground'
                            : ''
                        }
                      >
                        Navigator
                      </span>
                      {!isModelAvailable(subscription?.plan, 'NAVIGATOR') && (
                        <span className="text-xs font-medium text-primary ml-auto">
                          Upgrade
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Enhanced search with up to 240 results
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="EXPLORER" className="cursor-pointer">
                  <div className="space-y-1 w-full">
                    <div className="flex items-center w-full">
                      <span
                        className={
                          !isModelAvailable(subscription?.plan, 'EXPLORER')
                            ? 'text-muted-foreground'
                            : ''
                        }
                      >
                        Explorer
                      </span>
                      {!isModelAvailable(subscription?.plan, 'EXPLORER') && (
                        <span className="text-xs font-medium text-primary ml-auto">
                          Upgrade
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Advanced search with up to 1000 results
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="PRO" className="cursor-pointer">
                  <div className="space-y-1 w-full">
                    <div className="flex items-center w-full">
                      <span
                        className={
                          !isModelAvailable(subscription?.plan, 'PRO')
                            ? 'text-muted-foreground'
                            : ''
                        }
                      >
                        Pro
                      </span>
                      {!isModelAvailable(subscription?.plan, 'PRO') && (
                        <span className="text-xs font-medium text-primary ml-auto">
                          Upgrade
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Premium search with up to 4000 results
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
