import { useCallback, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import type { MapboxLocationParameters } from '@/features/map-display/types'
import {
  type GeocodingResult,
  debouncedSearchLocations,
} from '@/lib/mapbox/geocoding'
import { Command as CommandPrimitive } from 'cmdk'
import {
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { LoadingSpinner } from '../ui/loading-spinner'
interface LocationAutocompleteProps {
  onLocationSelect: (location: MapboxLocationParameters) => void
}

export function LocationAutocomplete({
  onLocationSelect,
}: LocationAutocompleteProps) {
  const [locations, setLocations] = useState<GeocodingResult>({
    options: [],
    value: null,
  })
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setOpen] = useState(false)
  const [selected, setSelected] = useState<GeocodingResult['options'][number]>()
  const [inputValue, setInputValue] = useState('')

  const debouncedHandleSearch = useCallback(async (value: string) => {
    if (!value) {
      setLocations({ options: [], value: null })
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
    (selectedOption: GeocodingResult['options'][number]) => {
      setInputValue(selectedOption.place_formatted)
      setSelected(selectedOption)
      onLocationSelect({
        latitude: selectedOption.coordinates[1],
        longitude: selectedOption.coordinates[0],
        radiusInMeters: 1000,
      })
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

      if (!isOpen && locations.value !== null) {
        setOpen(true)
      }

      if (event.key === 'Enter' && input.value !== '') {
        const optionToSelect = locations.options.find(
          (option) => option.name === input.value,
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
    setInputValue(selected?.place_formatted ?? '')
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
            {locations.options.length > 0 && !loading ? (
              <CommandGroup>
                {locations.options.map((option) => {
                  const isSelected =
                    selected?.place_formatted === option.place_formatted
                  return (
                    <CommandItem
                      key={option.place_formatted}
                      value={option.place_formatted}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                      }}
                      onSelect={() => handleSelectOption(option)}
                      className={cn(
                        'flex w-full items-center gap-2 cursor-pointer',
                        !isSelected ? 'pl-8' : null,
                      )}
                    >
                      {isSelected ? <Check className="w-4" /> : null}
                      {option.place_formatted}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ) : null}
            {!loading && locations.value !== null ? (
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
