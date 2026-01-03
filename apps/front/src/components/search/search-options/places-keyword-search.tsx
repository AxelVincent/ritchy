import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useCreateSearch } from '@/api/mutations/search/useCreateSearch'
import { useUserMe } from '@/api/queries/users/useUserMe'
import { CalButton } from '@/components/common/CalButton'
import { LocationAutocomplete as SearchLocationAutocomplete } from '@/components/search/location-autocomplete'
import type { Location } from '@/components/search/search-map'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { isModelAvailable } from '@/lib/subscription'
import type { CreateSearchRequestBody, GeocodeLocation } from '@ritchy/types'
import { debounce } from 'lodash'
import {
  Building2,
  ChevronDown,
  Globe,
  Loader2,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

interface PlacesKeywordSearchProps {
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
  onLocationChange: (location: Location) => void
}

export const PlacesKeywordSearch = ({
  updateSearchParams,
  onLocationChange,
}: PlacesKeywordSearchProps) => {
  const navigate = useNavigate()
  const { data: me } = useUserMe()
  const [isSearching, setIsSearching] = useState(false)
  const [autoEnrich, setAutoEnrich] = useState(false)
  const userPlan = me?.plan || 'FREE'
  const createSearchMutation = useCreateSearch()

  const {
    placeName,
    keyword,
    model,
    northEastLat,
    northEastLng,
    southWestLat,
    southWestLng,
  } = useSearch({ from: '/_auth/search/' })

  // Pre-select the highest available model for the user
  useEffect(() => {
    if (me?.plan && !model) {
      if (isModelAvailable(me.plan, 'ENHANCED')) {
        updateSearchParams({ model: 'ENHANCED' })
      } else {
        updateSearchParams({ model: 'BASIC' })
      }
    }
  }, [me?.plan, updateSearchParams, model])

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
      onLocationChange(updatedLocation)
      updateSearchParams({
        placeName: location.formatted_address,
      })
    },
    [updateSearchParams, onLocationChange],
  )

  const handleModelChange = (value: typeof model) => {
    updateSearchParams({ model: value as 'BASIC' | 'ENHANCED' })
  }

  const triggerSearch = useCallback(() => {
    if (isSearching) return
    setIsSearching(true)

    if (
      !northEastLat ||
      !northEastLng ||
      !southWestLat ||
      !southWestLng ||
      !keyword ||
      !model
    ) {
      return
    }

    const search: CreateSearchRequestBody = {
      rectangle: {
        northEast: {
          latitude: northEastLat,
          longitude: northEastLng,
        },
        southWest: {
          latitude: southWestLat,
          longitude: southWestLng,
        },
      },
      placeName: placeName || '',
      keyword,
      model,
      autoEnrich,
    }

    createSearchMutation.mutate(search, {
      onSuccess: (response) => {
        if ('id' in response) {
          navigate({
            to: '/search/$searchId',
            params: { searchId: response.id },
          })
        }
      },
      onError: (error) => {
        console.error(error)
        toast.info(error.message, {
          action: (
            <Button onClick={() => navigate({ to: '/pricing' })}>
              View Plans
            </Button>
          ),
        })
      },
      onSettled: () => {
        setIsSearching(false)
      },
    })
  }, [
    northEastLat,
    northEastLng,
    southWestLat,
    southWestLng,
    placeName,
    keyword,
    model,
    autoEnrich,
    createSearchMutation,
    navigate,
    isSearching,
  ])

  const debouncedTriggerSearch = useMemo(
    () => debounce(triggerSearch, 1000),
    [triggerSearch],
  )

  const handleComplete = () => {
    debouncedTriggerSearch()
  }

  // Check if search can be triggered
  const canSearch =
    northEastLat &&
    northEastLng &&
    southWestLat &&
    southWestLng &&
    keyword &&
    model

  return (
    <div className="space-y-4">
      {/* Search Term */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">
          Business type
        </Label>
        <p className="text-xs text-muted-foreground">
          What kind of companies are you looking for?
        </p>
        <Input
          value={keyword?.replace('+', ' ')}
          onChange={(e) => updateSearchParams({ keyword: e.target.value })}
          onClear={() => updateSearchParams({ keyword: '' })}
          placeholder="Restaurant, surf shop, cocktail bar..."
          minLength={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && keyword?.trim()) {
              e.preventDefault()
            }
          }}
          required
          autoFocus
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">
          Location
        </Label>
        <p className="text-xs text-muted-foreground">
          Type a location or select an area on the map
        </p>
        <SearchLocationAutocomplete
          onLocationSelect={handleLocationSelect}
          initialAddress={placeName?.replace(/\+/g, ' ')}
          autoFocus={false}
        />
      </div>

      {/* Model Selection - Compact */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">
          Number of companies
        </Label>
        <div className="flex gap-2">
          <Button
            variant={model === 'BASIC' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModelChange('BASIC')}
            className="flex-1"
          >
            Up to 60 companies
          </Button>
          <Button
            variant={model === 'ENHANCED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModelChange('ENHANCED')}
            className="flex-1"
            disabled={!isModelAvailable(userPlan, 'ENHANCED')}
          >
            Up to 240 companies
            {!isModelAvailable(userPlan, 'ENHANCED') && (
              <span className="text-xs ml-1">↑</span>
            )}
          </Button>
        </div>
      </div>

      {/* Auto-enrich Toggle */}
      <Collapsible className="rounded-lg border bg-muted/30">
        <div className="flex items-center space-x-3 p-3">
          <Checkbox
            id="auto-enrich"
            checked={autoEnrich}
            onCheckedChange={(checked) => setAutoEnrich(checked === true)}
            disabled={!canSearch}
          />
          <div className="flex-1 space-y-0.5">
            <Label
              htmlFor="auto-enrich"
              className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              Enrich
            </Label>
            <p className="text-xs text-muted-foreground">
              Up to {model === 'BASIC' ? '60' : '240'} credits
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              Already enriched companies won't be charged
            </p>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              <span className="sr-only">Toggle details</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0">
            <div className="rounded-md bg-muted/50 p-2.5">
              <p className="text-xs font-medium mb-2 text-muted-foreground">
                What you'll get
              </p>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>
                    Legal company data (creation date, workforce, etc)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Decision-makers when available</span>
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>
                    Company website data (description, services, socials, etc)
                  </span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                All results are ready to use
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Search Button */}
      <Button
        onClick={handleComplete}
        disabled={isSearching || !canSearch}
        className="w-full"
      >
        {isSearching ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <Search className="h-4 w-4 mr-2" />
        )}
        {isSearching ? 'Finding companies...' : 'Find companies'}
      </Button>

      {/* Upgrade CTA - Compact */}
      <div className="text-center">
        <CalButton variant="outline" size="sm" className="text-xs">
          Need more power? Contact us
        </CalButton>
      </div>
    </div>
  )
}
