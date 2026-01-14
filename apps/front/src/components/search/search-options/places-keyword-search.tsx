import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'

import { useCreateSearch } from '@/api/mutations/search/useCreateSearch'
import { useUserMe } from '@/api/queries/users/useUserMe'
import { CalButton } from '@/components/common/CalButton'
import { LimitSelector } from '@/components/search/limit-selector'
import { LocationAutocomplete as SearchLocationAutocomplete } from '@/components/search/location-autocomplete'
import type { Location } from '@/components/search/search-map'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import type { GeocodeLocation } from '@api/routes_web/places/geocode/contract'
import type { CreateSearchRequest } from '@api/routes_web/searches/create/contract'
import { debounce } from 'lodash'
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  Globe,
  Loader2,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

// Derive minimum required model from a given limit
const getMinimumRequiredModel = (limit: number): 'BASIC' | 'ENHANCED' => {
  if (limit <= 60) return 'BASIC'
  return 'ENHANCED'
}

interface PlacesKeywordSearchProps {
  updateSearchParams: (
    updates: Partial<{
      mode: 'keyword' | 'unique'
      keyword: string
      placeName: string
      model: 'BASIC' | 'ENHANCED'
      limit: number
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
  const [autoEnrich, setAutoEnrich] = useState(true)
  const [limit, setLimit] = useState(60)
  const createSearchMutation = useCreateSearch()

  const {
    placeName,
    keyword,
    northEastLat,
    northEastLng,
    southWestLat,
    southWestLng,
  } = useSearch({ from: '/_auth/search/' })

  // Derive model from limit
  const model = useMemo(() => getMinimumRequiredModel(limit), [limit])

  // Credit calculations (company enrichment = 1 credit per company)
  const userCredits = me?.credits?.credits ?? 0
  const maxCredits = me?.credits?.plan ?? 100
  const creditsNeeded = limit // 1 credit per company
  const hasSufficientCredits = userCredits >= creditsNeeded
  const creditDeficit = Math.max(0, creditsNeeded - userCredits)
  const creditsUsagePercentage = Math.min(
    (creditsNeeded / maxCredits) * 100,
    100,
  )

  // Handle limit change
  const handleLimitChange = useCallback(
    (newLimit: number) => {
      setLimit(newLimit)
      const newModel = getMinimumRequiredModel(newLimit)
      updateSearchParams({ limit: newLimit, model: newModel })
    },
    [updateSearchParams],
  )

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

    const search: CreateSearchRequest = {
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
      limit,
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
    limit,
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
    model &&
    limit > 0 &&
    (!autoEnrich || hasSufficientCredits)

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

      {/* Limit Selector */}
      <LimitSelector
        value={limit}
        onChange={handleLimitChange}
        disabled={isSearching}
      />

      {/* Auto-enrich Toggle */}
      <Collapsible className="rounded-lg border bg-muted/30">
        <div className="flex items-center space-x-3 p-3">
          <Checkbox
            id="auto-enrich"
            checked={autoEnrich}
            onCheckedChange={(checked) => setAutoEnrich(checked === true)}
          />
          <div className="flex-1 space-y-1.5">
            <Label
              htmlFor="auto-enrich"
              className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              Enrich
            </Label>

            {/* Credit info */}
            {autoEnrich && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {creditsNeeded} credits needed
                  </span>
                  <span
                    className={
                      hasSufficientCredits
                        ? 'text-green-600'
                        : 'text-destructive'
                    }
                  >
                    {userCredits} available
                  </span>
                </div>
                <Progress value={creditsUsagePercentage} className="h-1.5" />
                {!hasSufficientCredits && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Need {creditDeficit} more credits</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-destructive underline"
                      onClick={() => navigate({ to: '/pricing' })}
                    >
                      Add credits
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!autoEnrich && (
              <p className="text-[11px] text-muted-foreground/70">
                Enable to enrich all results automatically
              </p>
            )}
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
                Already enriched companies won't be charged
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
