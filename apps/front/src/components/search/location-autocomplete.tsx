import { usePlaceAutocomplete } from '@/api/mutations/places/autocomplete/usePlaceAutocomplete'
import { usePlaceGeocode } from '@/api/queries/places/usePlaceGeocode'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { AutocompletePrediction, GeocodeLocation } from '@ritchy/types'
import { debounce } from 'lodash'
import { Loader2, MapPin, Store } from 'lucide-react'
import * as React from 'react'
import { useEffect } from 'react'

interface LocationAutocompleteProps {
  onLocationSelect: (location: GeocodeLocation) => void
  initialAddress?: string
  autoFocus?: boolean
  onClear?: () => void
}

export function LocationAutocomplete({
  onLocationSelect,
  initialAddress,
  autoFocus,
  onClear,
}: LocationAutocompleteProps) {
  const [value, setValue] = React.useState('')
  const [inputValue, setInputValue] = React.useState(initialAddress || '')
  const [selectedPlaceId, setSelectedPlaceId] = React.useState<string | null>(
    null,
  )
  const [shouldFetchGeocode, setShouldFetchGeocode] = React.useState(false)
  const [predictions, setPredictions] = React.useState<
    AutocompletePrediction[]
  >([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)

  const { mutate: searchPlaces, data: response } = usePlaceAutocomplete()
  const { data: geocodeData } = usePlaceGeocode(selectedPlaceId || '', {
    enabled: shouldFetchGeocode,
  })

  const debouncedSearch = React.useMemo(
    () =>
      debounce((search: string) => {
        if (search.length >= 3) {
          setIsSearching(true)
          searchPlaces({ input: search })
        }
      }, 600),
    [searchPlaces],
  )

  React.useEffect(() => {
    if (isEditing && !selectedPlaceId && inputValue) {
      debouncedSearch(inputValue)
    }
    return () => debouncedSearch.cancel()
  }, [inputValue, debouncedSearch, selectedPlaceId, isEditing])

  React.useEffect(() => {
    if (initialAddress) {
      setInputValue(initialAddress)
    }
  }, [initialAddress])

  useEffect(() => {
    if (response && 'predictions' in response) {
      setPredictions(response.predictions)
      setIsSearching(false)
    }
  }, [response])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsEditing(true)
    setSelectedPlaceId(null)
    setInputValue(e.target.value)
  }

  const handleLocationSelect = async (location: AutocompletePrediction) => {
    setValue(location.placeId)
    setInputValue(location.text)
    setPredictions([])
    setSelectedPlaceId(location.placeId)
    setShouldFetchGeocode(true)
    setIsEditing(false)
  }

  useEffect(() => {
    if (
      geocodeData &&
      'result' in geocodeData &&
      'formatted_address' in geocodeData.result
    ) {
      onLocationSelect({
        formatted_address: inputValue,
        geometry: geocodeData.result.geometry,
        place_id:
          'place_id' in geocodeData.result ? geocodeData.result.place_id : '',
      })
      setShouldFetchGeocode(false)
    }
  }, [geocodeData, onLocationSelect, inputValue])

  const getLocationIcon = (types: string[]) => {
    if (types.includes('establishment')) {
      return <Store className="h-4 w-4 shrink-0" />
    }
    return <MapPin className="h-4 w-4 shrink-0" /> // default icon
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          placeholder="Search location..."
          value={inputValue}
          onChange={handleInputChange}
          onClear={() => {
            setInputValue('')
            setPredictions([])
            setSelectedPlaceId(null)
            setIsEditing(false)
            onClear?.()
          }}
          autoFocus={autoFocus}
        />
      </div>

      {isSearching ? (
        <div className="flex items-center gap-2 p-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Searching companies...
          </span>
        </div>
      ) : (
        predictions.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Companies</p>

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
        )
      )}
    </div>
  )
}
