import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  isSubscriptionSuccess,
  useUserSubscription,
} from '@/api/queries/users/useUserSubscription'
import type { Location } from '@/components/mapbox/search-map'
import { LocationAutocomplete as SearchLocationAutocomplete } from '@/components/search/location-autocomplete'
import { isModelAvailable } from '@/lib/subscription'
import type { GeocodeLocation, SearchModel } from '@ritchy/types'

interface PlaceSearchProps {
  location: Location
  className?: string
  onLocationChange?: (location: Location) => void
  onSearchInfoChange?: (searchInfo: {
    keyword: string
    placeName: string
    model: SearchModel
  }) => void
}

export const PlacesTextSearch = ({
  location,
  onLocationChange,
  onSearchInfoChange,
}: PlaceSearchProps) => {
  const navigate = useNavigate()
  const { data: subscription } = useUserSubscription()
  const [searchText, setSearchText] = useState('')
  const [placeName, setPlaceName] = useState('')
  const [model, setModel] = useState<SearchModel>('ESSENTIALS')
  const currentLocationRef = useRef<Location>(location)
  const userPlan =
    subscription && isSubscriptionSuccess(subscription)
      ? subscription.plan
      : 'FREE'
  const [isOpen, setIsOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [step, setStep] = useState(0)

  useEffect(() => {
    currentLocationRef.current = {
      ...location,
      bounds: location.bounds,
    }
  }, [location])

  const handleLocationSelect = useCallback(
    (location: GeocodeLocation) => {
      const updatedLocation = {
        center: {
          latitude: location.geometry.location.lat,
          longitude: location.geometry.location.lng,
        },
        bounds: currentLocationRef.current.bounds,
      }

      onLocationChange?.(updatedLocation)
      setPlaceName(location.formatted_address)
      nextStep()
    },
    [onLocationChange],
  )

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

  const handleComplete = () => {
    const searchPowerLabel = {
      ESSENTIALS: 'Basic',
      NAVIGATOR: 'Enhanced',
      EXPLORER: 'Advanced',
      PRO: 'Premium',
    }[model]

    const combinedInput = [
      placeName,
      `"${searchText}"`,
      `(${searchPowerLabel} search)`,
    ]
      .filter(Boolean)
      .join(' • ')

    setSearchInput(combinedInput)
    setIsOpen(false)
    onSearchInfoChange?.({
      keyword: searchText,
      placeName: placeName,
      model: model,
    })
  }

  const nextStep = () => {
    setStep(step + 1)
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Where are you searching?</h2>
            <div className="space-y-1.5">
              <SearchLocationAutocomplete
                onLocationSelect={handleLocationSelect}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={nextStep}>Next</Button>
            </div>
          </div>
        )
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">What are you looking for?</h2>
            <div className="space-y-1.5">
              <div className="relative">
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Restaurant, surf shop, cocktail bar, etc."
                  minLength={3}
                  required
                />
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={!searchText.trim()}
                aria-label={
                  !searchText.trim()
                    ? 'Please enter a search term'
                    : 'Next step'
                }
              >
                Next
              </Button>
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choose your search power</h2>
            <div className="space-y-1.5">
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
            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button onClick={handleComplete}>Complete</Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="relative w-full max-w-sm">
        {!isOpen && (
          <>
            <Input
              value={searchInput}
              placeholder="Search your next customers"
              className="pr-10 bg-background min-w-[300px]"
              readOnly
              onClick={() => {
                setStep(0)
                setIsOpen(true)
              }}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </>
        )}
      </div>

      {isOpen && (
        <Card className="w-full max-w-sm min-w-[300px]">
          <CardContent className="p-4">{renderStep()}</CardContent>
        </Card>
      )}
    </div>
  )
}
