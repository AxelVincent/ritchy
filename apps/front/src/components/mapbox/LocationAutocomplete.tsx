import { useCallback, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { debouncedSearchLocations } from '@/lib/mapbox/geocoding'
import { Command as CommandPrimitive } from 'cmdk'
import {
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command-location-dropdown'

import { cn } from '@/lib/utils'
import type { GeocodingResult, MapboxGeocodeResponse } from '@ritchy/types'
import { Check } from 'lucide-react'
import { LoadingSpinner } from '../ui/loading-spinner'
interface LocationAutocompleteProps {
  onLocationSelect: (location: GeocodingResult) => void
}

export function LocationAutocomplete({
  onLocationSelect,
}: LocationAutocompleteProps) {
  const [locations, setLocations] = useState<MapboxGeocodeResponse>({
    features: [],
    attribution: '',
    type: 'FeatureCollection',
  })
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setOpen] = useState(false)
  const [selected, setSelected] = useState<GeocodingResult>()
  const [inputValue, setInputValue] = useState('')

  const debouncedHandleSearch = useCallback(async (value: string) => {
    if (!value) {
      setLocations({ features: [], attribution: '', type: 'FeatureCollection' })
      return
    }

    setLoading(true)
    try {
      const results = await debouncedSearchLocations(value)
      setLocations(results)
    } catch (error) {
      console.error('Failed to search locations:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value)
      debouncedHandleSearch(value)
    },
    [debouncedHandleSearch],
  )

  const handleSelectOption = useCallback(
    (selectedOption: GeocodingResult) => {
      setInputValue(selectedOption.place_name)
      setSelected(selectedOption)
      onLocationSelect(selectedOption)
      setTimeout(() => {
        inputRef?.current?.blur()
      }, 0)
    },
    [onLocationSelect],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current
      if (!input) return

      if (!isOpen && locations.features.length > 0) {
        setOpen(true)
      }

      if (event.key === 'Enter' && input.value !== '') {
        const optionToSelect = locations.features.find(
          (feature) => feature.text === input.value,
        )
        if (optionToSelect) {
          handleSelectOption(optionToSelect)
        }
      }

      if (event.key === 'Escape') {
        input.blur()
      }
    },
    [isOpen, locations, handleSelectOption],
  )

  const handleBlur = useCallback(() => {
    setOpen(false)
    setInputValue(selected?.place_name ?? '')
  }, [selected])

  return (
    <CommandPrimitive onKeyDown={handleKeyDown} className="w-full">
      <div>
        <CommandInput
          ref={inputRef}
          value={inputValue}
          onValueChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => {
            setOpen(true)
          }}
          placeholder="Paris, New York, London, etc."
          className="text-base"
        />
      </div>
      <div className="relative mt-1">
        <div
          className={cn(
            'animate-in fade-in-0 zoom-in-95 absolute top-0 z-10 w-full rounded-xl bg-white outline-none',
            isOpen ? 'block' : 'hidden',
          )}
        >
          <CommandList className="rounded-lg  ring-slate-200">
            {loading ? (
              <div className="flex justify-center items-center p-2">
                <LoadingSpinner />
              </div>
            ) : null}
            {locations.features.length > 0 && !loading ? (
              <CommandGroup>
                {locations.features.map((feature) => {
                  const isSelected = selected?.place_name === feature.place_name
                  return (
                    <CommandItem
                      key={feature.place_name}
                      value={feature.place_name}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                      }}
                      onSelect={() => handleSelectOption(feature)}
                      className={cn(
                        'flex w-full items-center gap-2 cursor-pointer',
                        !isSelected ? 'pl-8' : null,
                      )}
                    >
                      {isSelected ? <Check className="w-4" /> : null}
                      {feature.place_name}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ) : null}
            {!loading && locations.attribution !== '' ? (
              <CommandPrimitive.Empty className="select-none rounded-sm px-2 py-3 text-center text-sm">
                No results found
              </CommandPrimitive.Empty>
            ) : null}
          </CommandList>
        </div>
      </div>
    </CommandPrimitive>
  )
}
