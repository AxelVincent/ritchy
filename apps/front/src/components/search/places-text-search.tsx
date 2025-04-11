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
import { LocationAutocomplete as SearchLocationAutocomplete } from '@/components/search/location-autocomplete'
import type { Location } from '@/components/search/search-map'
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [isSelectOpen, setIsSelectOpen] = useState(false)

  // Remove the refs and focus effect since we'll use autoFocus prop
  const [isFirstRender, setIsFirstRender] = useState(true)

  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false)
      return
    }
  }, [isFirstRender])

  useEffect(() => {
    currentLocationRef.current = {
      ...location,
      bounds: location.bounds,
    }
  }, [location])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If the select is open, don't handle card closing
      if (isSelectOpen) {
        return
      }

      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [isSelectOpen])

  // Add keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      // Prevent handling if focus is in a select element
      if (isSelectOpen) return

      switch (event.key) {
        case 'Enter':
          event.preventDefault()
          if (step === 0 && placeName) {
            nextStep()
          } else if (step === 1 && searchText.trim()) {
            nextStep()
          } else if (step === 2) {
            handleComplete()
          }
          break
        case 'ArrowRight':
          event.preventDefault()
          if (step === 0 && placeName) {
            nextStep()
          } else if (step === 1 && searchText.trim()) {
            nextStep()
          }
          break
        case 'ArrowLeft':
          event.preventDefault()
          if (step > 0) {
            prevStep()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isSelectOpen, step, placeName, searchText])

  const handleLocationSelect = useCallback(
    (location: GeocodeLocation) => {
      const updatedLocation = {
        center: {
          latitude: location.geometry.location.lat,
          longitude: location.geometry.location.lng,
        },
        bounds: {
          northEast: {
            latitude: location.geometry.viewport.northeast.lat,
            longitude: location.geometry.viewport.northeast.lng,
          },
          southWest: {
            latitude: location.geometry.viewport.southwest.lat,
            longitude: location.geometry.viewport.southwest.lng,
          },
        },
      }

      onLocationChange?.(updatedLocation)
      setPlaceName(location.formatted_address)
      if (location.formatted_address) {
        nextStep()
      }
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
    nextStep()
    setIsOpen(false)
  }

  const nextStep = () => {
    const searchPowerLabel = {
      ESSENTIALS: 'Essentials (60 results)',
      NAVIGATOR: 'Navigator (240 results)',
      EXPLORER: 'Explorer (1000 results)',
      PRO: 'Pro (4000 results)',
    }[model]

    const parts = []
    if (step >= 1 && searchText) {
      parts.push(searchText)
      parts.push(`${searchPowerLabel}`)
    }

    const combinedInput = parts.filter(Boolean).join(' • ')
    setSearchInput(combinedInput)

    if (step >= 1 && searchText) {
      onSearchInfoChange?.({
        keyword: searchText,
        placeName: placeName || '',
        model: model,
      })
    }

    setStep(step + 1)
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  const renderStep = () => {
    const totalSteps = 3
    const stepNames = ['location', 'search', 'model']
    const stepIndicator = (
      <div className="mb-4">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>
            Step {step + 1} of {totalSteps}
          </span>
          <div className="flex gap-1">
            {stepNames.map((name, i) => (
              <div
                key={name}
                className={`h-1.5 w-8 rounded-full ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    )

    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            {stepIndicator}
            <h2 className="text-lg font-semibold">Where are you searching?</h2>
            <div className="space-y-1.5">
              <SearchLocationAutocomplete
                onLocationSelect={handleLocationSelect}
                initialAddress={placeName}
                autoFocus={!isFirstRender}
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant={placeName ? 'default' : 'secondary'}
                onClick={nextStep}
              >
                {placeName ? 'Next' : 'Skip'}
              </Button>
            </div>
          </div>
        )
      case 1:
        return (
          <div className="space-y-4">
            {stepIndicator}
            <h2 className="text-lg font-semibold">What are you looking for?</h2>
            <div className="space-y-1.5">
              <div className="relative">
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onClear={() => setSearchText('')}
                  placeholder="Restaurant, surf shop, cocktail bar, etc."
                  minLength={3}
                  required
                  autoFocus
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
            {stepIndicator}
            <h2 className="text-lg font-semibold">Choose your search power</h2>
            <div className="space-y-1.5">
              <Select
                value={model}
                onValueChange={handleModelChange}
                onOpenChange={setIsSelectOpen}
              >
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
    <div
      className="absolute top-4 left-1/2 md:left-4 -translate-x-1/2 md:-translate-x-0 z-10"
      ref={containerRef}
    >
      <div className="relative w-[calc(100vw-120px)] md:w-[min(100%,_max(300px,_fit-content))] max-w-sm">
        {!isOpen && (
          <>
            <Input
              value={searchInput}
              placeholder="Search your next customers"
              className="bg-background w-full h-[40px] border-x"
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
