import { usePlaceAutocomplete } from '@/api/mutations/places/autocomplete/usePlaceAutocomplete'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { AutocompletePrediction } from '@ritchy/types'
import { debounce } from 'lodash'
import { Loader2, MapPin, Store } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CsvRow } from './import'

interface AmbiguousPlaceModalProps {
  row: CsvRow
  onResolve: (placeId: string) => void
  onSkip: () => void
  currentIndex: number
  totalAmbiguous: number
}

export const AmbiguousPlaceModal = ({
  row,
  onResolve,
  onSkip,
  currentIndex,
  totalAmbiguous,
}: AmbiguousPlaceModalProps) => {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>()
  const [inputValue, setInputValue] = useState(row.placeName || '')
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>(
    row.predictions || [],
  )
  const [isSearching, setIsSearching] = useState(false)
  const [showingOriginal, setShowingOriginal] = useState(true)

  const { mutate: searchPlaces, data: searchResponse } = usePlaceAutocomplete()

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce((search: string) => {
        if (search.length >= 3) {
          setIsSearching(true)
          const sessionToken = crypto.randomUUID()
          searchPlaces({ input: search.trim(), sessionToken })
        } else if (search.length === 0) {
          // Reset to original predictions when input is cleared
          setPredictions(row.predictions || [])
          setShowingOriginal(true)
        }
      }, 600),
    [searchPlaces, row.predictions],
  )

  // Trigger search when input changes
  useEffect(() => {
    if (inputValue && inputValue !== row.placeName) {
      setShowingOriginal(false)
      debouncedSearch(inputValue)
    }
    return () => debouncedSearch.cancel()
  }, [inputValue, debouncedSearch, row.placeName])

  // Update predictions when search response arrives
  useEffect(() => {
    if (searchResponse && 'predictions' in searchResponse) {
      setPredictions(searchResponse.predictions)
      setIsSearching(false)
    }
  }, [searchResponse])

  const handlePlaceSelect = (prediction: AutocompletePrediction) => {
    setSelectedPlaceId(prediction.placeId)
    onResolve(prediction.placeId)
  }

  const getLocationIcon = (types: string[]) => {
    if (types.includes('establishment')) {
      return <Store className="h-4 w-4 shrink-0" />
    }
    return <MapPin className="h-4 w-4 shrink-0" />
  }

  return (
    <Dialog open>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Multiple Results Found</DialogTitle>
          <DialogDescription>
            {totalAmbiguous > 1 && (
              <span className="text-xs text-muted-foreground">
                Resolving ambiguous place {currentIndex} of {totalAmbiguous}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-md bg-muted">
            <p className="text-sm text-muted-foreground">
              Row {row.rowIndex + 1}
            </p>
            <p className="font-semibold">{row.placeName}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              {showingOriginal
                ? `Found ${predictions.length} results. Click to select or search for a different place:`
                : `Search results (${predictions.length}). Click to select:`}
            </p>
            <Input
              placeholder="Search for a different place..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onClear={() => {
                setInputValue(row.placeName || '')
                setPredictions(row.predictions || [])
                setShowingOriginal(true)
              }}
              autoFocus
            />
          </div>

          <Separator />

          {isSearching ? (
            <div className="flex items-center gap-2 p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Searching locations...
              </span>
            </div>
          ) : predictions.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground border rounded-md">
              No results found. Try a different search query.
            </div>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {predictions.map((prediction) => (
                <div
                  key={prediction.placeId}
                  className={cn(
                    'flex items-center gap-3 p-3 cursor-pointer hover:bg-muted rounded-md transition-colors',
                    selectedPlaceId === prediction.placeId && 'bg-muted',
                  )}
                  onClick={() => handlePlaceSelect(prediction)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePlaceSelect(prediction)
                    }
                  }}
                >
                  {getLocationIcon(prediction.types)}
                  <div className="flex-1">
                    <p className="font-medium">{prediction.mainText}</p>
                    {prediction.secondaryText && (
                      <p className="text-sm text-muted-foreground">
                        {prediction.secondaryText}
                      </p>
                    )}
                    {prediction.types.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {prediction.types.slice(0, 3).map((type) => (
                          <span
                            key={type}
                            className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onSkip}>
            Skip This Place
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
