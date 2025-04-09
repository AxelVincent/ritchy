import { useCreateSearch } from '@/api/mutations/search/useCreateSearch'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { DEFAULT_LOCATION } from '@/components/map-display/constants'
import { type Location, SearchMap } from '@/components/mapbox/search-map'
import { PlacesTextSearch } from '@/components/search/places-text-search'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { CreateSearchRequestBody, SearchModel } from '@ritchy/types'

import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { debounce } from 'lodash'
import { useCallback, useEffect, useMemo, useState } from 'react'

export const Route = createFileRoute('/_auth/search/')({
  component: RouteComponent,
})

function RouteComponent() {
  const utils = useQueryClient()

  // Add this effect to handle subscription update
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (
      params.get('portal_return') === 'true' ||
      params.get('checkout_return') === 'true'
    ) {
      utils.invalidateQueries({ queryKey: ['userSubscription'] })
      // Clean up the URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [utils])

  // Core location state
  const defaultLocation = DEFAULT_LOCATION
  const { location: geoLocation, loading } = useGeolocation(
    defaultLocation,
    false,
  )
  const [currentLocation, setCurrentLocation] =
    useState<Location>(defaultLocation)

  const navigate = useNavigate()
  const createSearchMutation = useCreateSearch()

  const debouncedSetCurrentLocation = useMemo(
    () =>
      debounce((newLocation: Location) => {
        setCurrentLocation(newLocation)
      }, 100),
    [],
  )

  const handleLocationChange = useCallback(
    (newLocation: {
      center: Location['center']
      bounds: Location['bounds']
    }) => {
      debouncedSetCurrentLocation({
        center: newLocation.center,
        bounds: newLocation.bounds,
      })
    },
    [debouncedSetCurrentLocation],
  )

  const [searchInfo, setSearchInfo] = useState({
    keyword: '',
    placeName: '',
    model: 'ESSENTIALS',
  })

  const handleSearchInfoChange = (info: {
    keyword: string
    placeName: string
    model: SearchModel
  }) => {
    setSearchInfo(info)
  }

  const triggerSearch = () => {
    const search: CreateSearchRequestBody = {
      rectangle: currentLocation.bounds,
      placeName: searchInfo.placeName,
      keyword: searchInfo.keyword,
      model: searchInfo.model as SearchModel,
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
    })
  }

  // Update from geolocation only on initial load
  useEffect(() => {
    if (geoLocation && currentLocation === defaultLocation) {
      setCurrentLocation({
        center: geoLocation,
        bounds: defaultLocation.bounds,
      })
    }
  }, [geoLocation, currentLocation, defaultLocation])

  if (loading) {
    return <LoadingSpinner message="Detecting your location..." />
  }

  return (
    <div className="flex flex-col h-full relative">
      <PlacesTextSearch
        location={currentLocation}
        onLocationChange={handleLocationChange}
        onSearchInfoChange={handleSearchInfoChange}
      />
      <SearchMap
        onLocationChange={handleLocationChange}
        userLocation={currentLocation}
        onSearchArea={triggerSearch}
        searchInfo={searchInfo}
      />
    </div>
  )
}
