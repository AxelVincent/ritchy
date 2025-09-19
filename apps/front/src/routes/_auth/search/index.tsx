import { useCreateSearch } from '@/api/mutations/search/useCreateSearch'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { DEFAULT_LOCATION } from '@/components/map-display/constants'
import { type Location, SearchMap } from '@/components/search/search-map'
import { SearchOptions } from '@/components/search/search-options'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { CreateSearchRequestBody, GeocodeLocation } from '@ritchy/types'

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
  } = Route.useSearch()
  const navigate = useNavigate()
  const defaultLocation = DEFAULT_LOCATION
  const { location: geoLocation, loading } = useGeolocation(
    defaultLocation,
    false,
  )

  // Keep location state for map stability
  const [currentLocation, setCurrentLocation] = useState<Location>(() => {
    // Initialize from search params if available
    if (northEastLat && northEastLng && southWestLat && southWestLng) {
      const centerLat = (northEastLat + southWestLat) / 2
      const centerLng = (northEastLng + southWestLng) / 2

      return {
        center: {
          latitude: centerLat,
          longitude: centerLng,
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

    return defaultLocation
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
          mode: prev.mode ?? 'keyword',
          ...prev,
          ...updates,
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
      updateSearchParams({
        northEastLat: newLocation.bounds.northEast.latitude,
        northEastLng: newLocation.bounds.northEast.longitude,
        southWestLat: newLocation.bounds.southWest.latitude,
        southWestLng: newLocation.bounds.southWest.longitude,
      })
    },
    [updateSearchParams],
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

  const handlePlaceSelect = useCallback(
    (place: GeocodeLocation) => {
      const updatedLocation = {
        center: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
        },
        bounds: {
          northEast: {
            latitude: place.geometry.viewport.northeast.lat,
            longitude: place.geometry.viewport.northeast.lng,
          },
          southWest: {
            latitude: place.geometry.viewport.southwest.lat,
            longitude: place.geometry.viewport.southwest.lng,
          },
        },
      }
      updateSearchParams({
        northEastLat: updatedLocation.bounds.northEast.latitude,
        northEastLng: updatedLocation.bounds.northEast.longitude,
        southWestLat: updatedLocation.bounds.southWest.latitude,
        southWestLng: updatedLocation.bounds.southWest.longitude,
      })
      setSelectedPlace(place)
    },
    [updateSearchParams],
  )

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

  // Update from geolocation only on initial load
  useEffect(() => {
    if (geoLocation && currentLocation === defaultLocation) {
      setCurrentLocation(geoLocation)
      updateSearchParams({
        northEastLat: geoLocation.bounds.northEast.latitude,
        northEastLng: geoLocation.bounds.northEast.longitude,
        southWestLat: geoLocation.bounds.southWest.latitude,
        southWestLng: geoLocation.bounds.southWest.longitude,
      })
    }
  }, [geoLocation, currentLocation, defaultLocation, updateSearchParams])

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
      <SearchMap
        onLocationChange={handleLocationChange}
        userLocation={currentLocation}
        selectedPlace={selectedPlace}
      />
    </div>
  )
}
