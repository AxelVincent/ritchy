import { useCreateSearch } from '@/api/mutations/search/useCreateSearch'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { DEFAULT_LOCATION } from '@/components/map-display/constants'
import { type Location, SearchMap } from '@/components/search/search-map'
import { SearchOptions } from '@/components/search/search-options'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from '@/hooks/use-toast'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { GeocodeLocation } from '@api/routes_web/places/geocode/contract'
import type { CreateSearchRequest } from '@api/routes_web/searches/create/contract'
import { Menu } from 'lucide-react'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { debounce } from 'lodash'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

const searchSchema = z.object({
  mode: z.enum(['keyword', 'unique']).default('keyword'),
  keyword: z.string().optional(),
  placeName: z.string().optional(),
  model: z.enum(['BASIC', 'ENHANCED']).optional(),
  northEastLat: z.number().optional(),
  northEastLng: z.number().optional(),
  southWestLat: z.number().optional(),
  southWestLng: z.number().optional(),
  selectedPlaceId: z.string().optional(),
  selectedPlaceAddress: z.string().optional(),
  navTimestamp: z.number().optional(),
})
export type SearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_auth/search/')({
  component: RouteComponent,
  validateSearch: (search) => searchSchema.parse(search),
})

function RouteComponent() {
  const {
    mode,
    keyword,
    placeName,
    model,
    northEastLat,
    northEastLng,
    southWestLat,
    southWestLng,
    navTimestamp,
  } = Route.useSearch()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { toggleSidebar } = useSidebar()
  const defaultLocation = DEFAULT_LOCATION
  const { location: geoLocation, loading } = useGeolocation(
    defaultLocation,
    false,
  )

  const [currentLocation, setCurrentLocation] = useState<Location>(() => {
    // If we have bounds from URL, use them
    if (northEastLat && northEastLng && southWestLat && southWestLng) {
      return {
        center: {
          latitude: (northEastLat + southWestLat) / 2,
          longitude: (northEastLng + southWestLng) / 2,
        },
        bounds: {
          northEast: {
            latitude: northEastLat,
            longitude: northEastLng,
          },
          southWest: {
            latitude: southWestLat,
            longitude: southWestLng,
          },
        },
      }
    }
    // Otherwise use geolocation if available, or default location
    return geoLocation || defaultLocation
  })

  const createSearchMutation = useCreateSearch()

  // Add state for selected unique place
  const [selectedPlace, setSelectedPlace] = useState<GeocodeLocation | null>(
    null,
  )

  const updateSearchParams = useCallback(
    (updates: Partial<SearchParams>) => {
      navigate({
        to: '/search',
        search: (prev) => ({
          ...prev,
          ...updates,
          mode: (updates.mode ?? prev.mode ?? 'keyword') as
            | 'keyword'
            | 'unique',
        }),
        replace: true,
      })
    },
    [navigate],
  )

  const handleLocationChange = useCallback(
    (newLocation: {
      center: Location['center']
      bounds: Location['bounds']
    }) => {
      setCurrentLocation(newLocation)
    },
    [],
  )

  const [isSearching, setIsSearching] = useState(false)

  const triggerSearch = useCallback(() => {
    if (isSearching) return
    setIsSearching(true)

    if (
      !northEastLat ||
      !northEastLng ||
      !southWestLat ||
      !southWestLng ||
      !placeName ||
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
      placeName,
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
        toast({
          title: error.message,
          variant: 'default',
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

  const handlePlaceSelect = useCallback((place: GeocodeLocation) => {
    setSelectedPlace(place)
  }, [])

  const debouncedTriggerSearch = useMemo(
    () => debounce(triggerSearch, 1000),
    [triggerSearch],
  )

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedTriggerSearch.cancel()
    }
  }, [debouncedTriggerSearch])

  // Only update when navTimestamp changes (indicating programmatic navigation)
  // biome-ignore lint/correctness/useExhaustiveDependencies: //
  useEffect(() => {
    if (
      navTimestamp &&
      northEastLat &&
      northEastLng &&
      southWestLat &&
      southWestLng
    ) {
      setCurrentLocation({
        center: {
          latitude: (northEastLat + southWestLat) / 2,
          longitude: (northEastLng + southWestLng) / 2,
        },
        bounds: {
          northEast: {
            latitude: northEastLat,
            longitude: northEastLng,
          },
          southWest: {
            latitude: southWestLat,
            longitude: southWestLng,
          },
        },
      })
    }
  }, [navTimestamp])

  // Update from geolocation when no navigation parameters are present
  // biome-ignore lint/correctness/useExhaustiveDependencies: //
  useEffect(() => {
    // Only use geolocation if:
    // 1. No navTimestamp (not a navigation event)
    // 2. No bounds in URL (fresh page load)
    // 3. geoLocation is available and different
    if (
      !navTimestamp &&
      (!northEastLat || !northEastLng || !southWestLat || !southWestLng) &&
      geoLocation &&
      geoLocation !== currentLocation
    ) {
      setCurrentLocation(geoLocation)
    }
  }, [
    geoLocation,
    navTimestamp,
    northEastLat,
    northEastLng,
    southWestLat,
    southWestLng,
  ])

  if (loading) {
    return <LoadingSpinner message="Detecting your location..." />
  }

  return (
    <div className="flex flex-col h-full relative">
      <SearchOptions
        location={currentLocation}
        updateSearchParams={updateSearchParams}
        searchMode={mode}
        onPlaceSelect={handlePlaceSelect}
        onLocationChange={handleLocationChange}
        selectedPlace={selectedPlace}
        setSelectedPlace={setSelectedPlace}
      />
      <div className={isMobile ? 'flex-1 pb-14' : 'flex-1'}>
        <SearchMap
          key={navTimestamp}
          updateSearchParams={updateSearchParams}
          userLocation={currentLocation}
          selectedPlace={selectedPlace}
        />
      </div>
      {/* Mobile bottom bar with menu button */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.08)] safe-area-bottom">
          <div className="flex items-center h-14 px-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={toggleSidebar}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
