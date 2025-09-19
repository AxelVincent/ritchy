import * as Sentry from '@sentry/react'

import { useAddItemFromGeocode } from '@/api/mutations/lists/useAddItemFromGeocode'
import { useListsQuery } from '@/api/queries/lists/useLists'
import { LocationAutocomplete as SearchLocationAutocomplete } from '@/components/search/location-autocomplete'
import type { Location } from '@/components/search/search-map'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type { GeocodeLocation, List } from '@ritchy/types'
import { useNavigate } from '@tanstack/react-router'
import { MapPin, Plus, Store } from 'lucide-react'
import { useCallback, useState } from 'react'

interface PlacesUniqueSearchProps {
  location: Location
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
  onPlaceSelect: (place: GeocodeLocation) => void
  selectedPlace: GeocodeLocation | null
  setSelectedPlace: (place: GeocodeLocation | null) => void
}

export const PlacesUniqueSearch = ({
  onPlaceSelect,
  onLocationChange,
  selectedPlace,
  setSelectedPlace,
}: PlacesUniqueSearchProps) => {
  const [placeName, setPlaceName] = useState('')
  const [selectedListId, setSelectedListId] = useState<string>('')

  const { data: lists, isLoading: listsLoading } = useListsQuery()
  const addItemFromGeocode = useAddItemFromGeocode()
  const { toast } = useToast()
  const navigate = useNavigate()

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
      setSelectedPlace(location)
      setPlaceName(location.formatted_address)
      onPlaceSelect(location)
    },
    [onPlaceSelect, onLocationChange, setSelectedPlace],
  )

  const handleAddToList = async () => {
    if (selectedPlace && selectedListId) {
      try {
        await addItemFromGeocode.mutateAsync({
          googleMapsPlaceId: selectedPlace.place_id,
          listId: selectedListId,
        })

        toast({
          title: 'Success',
          description: 'Place added to list successfully',
        })

        // Navigate to the list
        navigate({ to: '/lists/$listId', params: { listId: selectedListId } })

        // Reset the form
        resetSearch()
      } catch (error: unknown) {
        // Handle 409 conflict (place already in list) gracefully
        if (
          error &&
          typeof error === 'object' &&
          'status' in error &&
          error.status === 409
        ) {
          toast({
            title: 'Already in list',
            description: 'This place is already in the selected list',
            variant: 'default',
          })
        } else {
          toast({
            title: 'Error',
            description: 'Failed to add place to list',
            variant: 'destructive',
          })
          Sentry.captureException(error)
        }
      }
    }
  }

  const resetSearch = () => {
    setSelectedPlace(null)
    setPlaceName('')
    setSelectedListId('')
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-muted-foreground">
        Find a specific place
      </Label>
      <SearchLocationAutocomplete
        onLocationSelect={handleLocationSelect}
        initialAddress={placeName}
        autoFocus={true}
        onClear={resetSearch}
      />

      {selectedPlace && (
        <Card className="border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Store className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm leading-tight">
                  {selectedPlace.formatted_address}
                </h3>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {selectedPlace.geometry.location.lat.toFixed(4)},{' '}
                    {selectedPlace.geometry.location.lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Select List
                </Label>
                <Select
                  value={selectedListId}
                  onValueChange={setSelectedListId}
                  disabled={listsLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a list..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lists?.map((list: List) => (
                      <SelectItem key={list.id} value={list.id}>
                        <div className="flex items-center gap-2">
                          <span>{list.emoji}</span>
                          <span>{list.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({list.itemCount} items)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleAddToList}
                size="sm"
                className="w-full gap-2"
                disabled={!selectedListId || addItemFromGeocode.isPending}
              >
                <Plus className="h-3 w-3" />
                {addItemFromGeocode.isPending ? 'Adding...' : 'Add to List'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
