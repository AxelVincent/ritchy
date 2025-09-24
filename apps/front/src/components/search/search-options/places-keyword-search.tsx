import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useCreateSearch } from '@/api/mutations/search/useCreateSearch'
import { useUserMe } from '@/api/queries/users/useUserMe'
import { CalButton } from '@/components/common/CalButton'
import { LocationAutocomplete as SearchLocationAutocomplete } from '@/components/search/location-autocomplete'
import type { Location } from '@/components/search/search-map'
import { Label } from '@/components/ui/label'
import { isModelAvailable } from '@/lib/subscription'
import type { CreateSearchRequestBody, GeocodeLocation } from '@ritchy/types'
import { debounce } from 'lodash'
import { Loader2, Search } from 'lucide-react'
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
    const plan = me?.plan || undefined

    if (
      !isModelAvailable(
        plan,
        value as 'BASIC' | 'ENHANCED' | 'ADVANCED' | 'EXPERT',
      )
    ) {
      navigate({ to: '/pricing' })
      return
    }

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
          Keyword
        </Label>
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
          Location (optional)
        </Label>
        <SearchLocationAutocomplete
          onLocationSelect={handleLocationSelect}
          initialAddress={placeName?.replace(/\+/g, ' ')}
          autoFocus={false}
        />
      </div>

      {/* Model Selection - Compact */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">
          Search power
        </Label>
        <div className="flex gap-2">
          <Button
            variant={model === 'BASIC' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModelChange('BASIC')}
            className="flex-1"
          >
            60 results
          </Button>
          <Button
            variant={model === 'ENHANCED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModelChange('ENHANCED')}
            className="flex-1"
            disabled={!isModelAvailable(userPlan, 'ENHANCED')}
          >
            240 results
            {!isModelAvailable(userPlan, 'ENHANCED') && (
              <span className="text-xs ml-1">↑</span>
            )}
          </Button>
        </div>
      </div>

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
        {isSearching ? 'Searching...' : 'Search'}
      </Button>

      {/* Upgrade CTA - Compact */}
      {!isModelAvailable(userPlan, 'ENHANCED') && (
        <div className="text-center">
          <CalButton variant="outline" size="sm" className="text-xs">
            Need more power? Contact us
          </CalButton>
        </div>
      )}
    </div>
  )
}
