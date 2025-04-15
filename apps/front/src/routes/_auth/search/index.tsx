import { useCreateSearch } from '@/api/mutations/search/useCreateSearch'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { DEFAULT_LOCATION } from '@/components/map-display/constants'
import type { MapboxLocationParameters } from '@/components/map-display/types'
import { SearchMap } from '@/components/mapbox/search-map'
import { PlacesTextSearch } from '@/components/search/places-text-search'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { CreateSearchRequestBody } from '@ritchy/types'

import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

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
    useState<MapboxLocationParameters>(defaultLocation)
  const [radiusInMeters, setRadiusInMeters] = useState(
    defaultLocation.radiusInMeters,
  )

  const navigate = useNavigate()
  const createSearchMutation = useCreateSearch()

  const triggerSearch = (search: CreateSearchRequestBody) => {
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

  const handleLocationChange = (newLocation: MapboxLocationParameters) => {
    setCurrentLocation({
      ...newLocation,
    })
  }

  // Update from geolocation only on initial load
  useEffect(() => {
    if (geoLocation && currentLocation === defaultLocation) {
      setCurrentLocation(geoLocation)
    }
  }, [geoLocation, currentLocation, defaultLocation])

  if (loading) {
    return <LoadingSpinner message="Detecting your location..." />
  }

  return (
    <div className="flex flex-col h-full">
      <PlacesTextSearch
        location={currentLocation}
        onSearch={triggerSearch}
        radiusInMeters={radiusInMeters}
        setRadiusInMeters={setRadiusInMeters}
        onLocationChange={handleLocationChange}
      />
      <SearchMap
        onLocationChange={handleLocationChange}
        userLocation={currentLocation}
        radiusInMeters={radiusInMeters}
      />
    </div>
  )
}
