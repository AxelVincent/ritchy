import { usePlaceAutocomplete } from '@/api/mutations/places/autocomplete/usePlaceAutocomplete'
import { usePlaceGeocode } from '@/api/queries/places/usePlaceGeocode'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { AutocompletePrediction, GeocodeLocation } from '@ritchy/types'
import { debounce } from 'lodash'
import { MapPin, Store } from 'lucide-react'
import * as React from 'react'
import { useEffect } from 'react'

interface LocationAutocompleteProps {
  onLocationSelect: (location: GeocodeLocation) => void
}

export function LocationAutocomplete({
  onLocationSelect,
}: LocationAutocompleteProps) {
  const [value, setValue] = React.useState('')
  const [inputValue, setInputValue] = React.useState('')
  const [selectedPlaceId, setSelectedPlaceId] = React.useState<string | null>(
    null,
  )

  const { mutate: searchPlaces, data: response } = usePlaceAutocomplete()
  const { data: geocodeData } = usePlaceGeocode(selectedPlaceId || '')

  const predictions =
    response && 'predictions' in response ? response.predictions : []

  const debouncedSearch = React.useMemo(
    () =>
      debounce((search: string) => {
        if (search.length >= 3) {
          searchPlaces({ input: search })
        }
      }, 300),
    [searchPlaces],
  )

  React.useEffect(() => {
    debouncedSearch(inputValue)
    return () => debouncedSearch.cancel()
  }, [inputValue, debouncedSearch])

  const handleLocationSelect = async (location: AutocompletePrediction) => {
    setValue(location.placeId)
    setInputValue(location.mainText)
    setSelectedPlaceId(location.placeId)
  }

  console.log('predictions', predictions)

  useEffect(() => {
    if (
      geocodeData &&
      'result' in geocodeData &&
      'geometry' in geocodeData.result
    ) {
      onLocationSelect({
        formatted_address: geocodeData.result.formatted_address,
        geometry: geocodeData.result.geometry,
      })
    }
  }, [geocodeData, onLocationSelect])

  const getLocationIcon = (types: string[]) => {
    if (types.includes('street_address')) {
      return <MapPin className="h-4 w-4 shrink-0" />
    }
    if (types.includes('establishment')) {
      return <Store className="h-4 w-4 shrink-0" />
    }
    return <MapPin className="h-4 w-4 shrink-0" /> // default icon
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search location..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />

      {predictions.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Locations</p>
          {predictions.map((location) => (
            <div
              key={location.placeId}
              className={cn(
                'flex items-center gap-2 p-2 cursor-pointer hover:bg-muted rounded-md',
                value === location.placeId && 'bg-muted',
              )}
              onClick={() => handleLocationSelect(location)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLocationSelect(location)
                }
              }}
            >
              {getLocationIcon(location.types)}
              <div className="flex flex-col">
                <span>{location.mainText}</span>
                <span className="text-sm text-muted-foreground">
                  {location.secondaryText}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
