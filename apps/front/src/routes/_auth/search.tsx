import { useCreateSearch } from '@/api/mutations/search/useCreateSearch'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { MapBox } from '@/features/map-display/components/map_box/MapBox'
import { PlacesTextSearch } from '@/features/map-display/components/search_section/PlacesTextSearch'
import { DEFAULT_LOCATION } from '@/features/map-display/constants'
import type { MapboxLocationParameters } from '@/features/map-display/types'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { CreateSearchRequestBody } from '@ritchy/types'

import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_auth/search')({
  component: RouteComponent,
})

function RouteComponent() {
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

  const createSearchMutation = useCreateSearch()

  const triggerSearch = (search: CreateSearchRequestBody) => {
    createSearchMutation.mutate(search)
  }

  // Update from geolocation only on initial load
  useEffect(() => {
    if (geoLocation && currentLocation === defaultLocation) {
      setCurrentLocation(geoLocation)
    }
  }, [geoLocation, currentLocation, defaultLocation])

  const handleLocationChange = (newLocation: MapboxLocationParameters) => {
    setCurrentLocation(newLocation)
  }

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
      <MapBox
        onLocationChange={handleLocationChange}
        searchResults={null}
        selectedPlaceId={null}
        setSelectedPlaceId={() => {}}
        userLocation={currentLocation}
        dataTableRowSelection={{}}
        radiusInMeters={radiusInMeters}
        listId={undefined}
        filteredPlaceIds={new Set()}
      />
    </div>
  )
}
