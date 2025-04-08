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
import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'

import {
  isSubscriptionSuccess,
  useUserSubscription,
} from '@/api/queries/users/useUserSubscription'
import { LocationAutocomplete } from '@/components/mapbox/location-autocomplete'
import type { Location } from '@/components/mapbox/search-map'
import { isModelAvailable } from '@/lib/subscription'
import type {
  CreateSearchRequestBody,
  GeocodingResult,
  SearchModel,
} from '@ritchy/types'
import { useEffect, useState } from 'react'

interface PlaceSearchProps {
  location: Location
  onSearch: (params: CreateSearchRequestBody) => void
  className?: string
  onLocationChange?: (location: Location) => void
  isLoading?: boolean
}

export const PlacesTextSearch = ({
  location,
  onSearch,
  onLocationChange,
  isLoading = false,
}: PlaceSearchProps) => {
  const navigate = useNavigate()
  const { data: subscription } = useUserSubscription()
  const [searchText, setSearchText] = useState('')
  const [placeName, setPlaceName] = useState('')
  const [model, setModel] = useState<SearchModel>('ESSENTIALS')
  const [currentLocation, setCurrentLocation] = useState<Location>(location)
  const userPlan =
    subscription && isSubscriptionSuccess(subscription)
      ? subscription.plan
      : 'FREE'

  useEffect(() => {
    setCurrentLocation({
      ...location,
      bounds: location.bounds,
    })
  }, [location])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchText.length < 3) {
      return
    }

    const searchParams: CreateSearchRequestBody = {
      rectangle: currentLocation.bounds,
      placeName: placeName,
      keyword: searchText,
      model,
    }

    onSearch(searchParams)
  }

  const handleClear = () => {
    setSearchText('')
    onSearch({
      rectangle: currentLocation.bounds,
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
      center: {
        latitude: newLocation.center[1],
        longitude: newLocation.center[0],
      },
      bounds: currentLocation.bounds,
    }

    setCurrentLocation(updatedLocation)
    onLocationChange?.(updatedLocation)
    setPlaceName(newLocation.place_name)
  }

  const handleModelChange = (value: typeof model) => {
    const plan =
      subscription && isSubscriptionSuccess(subscription)
        ? subscription.plan
        : undefined

    if (!isModelAvailable(plan, value)) {
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
                          !isModelAvailable(userPlan, 'NAVIGATOR')
                            ? 'text-muted-foreground'
                            : ''
                        }
                      >
                        Navigator
                      </span>
                      {!isModelAvailable(userPlan, 'NAVIGATOR') && (
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
                          !isModelAvailable(userPlan, 'EXPLORER')
                            ? 'text-muted-foreground'
                            : ''
                        }
                      >
                        Explorer
                      </span>
                      {!isModelAvailable(userPlan, 'EXPLORER') && (
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
                          !isModelAvailable(userPlan, 'PRO')
                            ? 'text-muted-foreground'
                            : ''
                        }
                      >
                        Pro
                      </span>
                      {!isModelAvailable(userPlan, 'PRO') && (
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
              disabled={searchText.length < 3 || isLoading}
              className="w-full sm:w-auto mb-1"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Searching...
                </>
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
    </div>
  )
}
