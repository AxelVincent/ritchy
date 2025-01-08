import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@ritchy/types'
import type { Column } from '@tanstack/react-table'
import { Check } from 'lucide-react'
import React, { useEffect, useMemo } from 'react'

export function Filter({
  column,
}: {
  column: Column<SearchResult>
}) {
  const { filterVariant } = column.columnDef.meta ?? {}

  const columnFilterValue = column.getFilterValue()

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const sortedUniqueValues = useMemo(() => {
    if (filterVariant === 'range') return []

    const selected = (columnFilterValue as string[]) || []
    const uniqueValues = Array.from(
      column.getFacetedUniqueValues().keys(),
    ).filter((value) => value !== undefined && value !== null && value !== '')

    // Combine current values with selected values
    const allValues = [...new Set([...uniqueValues, ...selected])]
      .sort()
      .slice(0, 5000)

    return allValues
  }, [column.getFacetedUniqueValues(), columnFilterValue, filterVariant])

  if (filterVariant === 'multi-select') {
    const selected = (columnFilterValue as string[]) || []

    return (
      <div className="space-y-1.5 sm:space-y-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full justify-start relative"
            >
              {selected.length === 0 && 'Select...'}
              {selected.length > 0 && (
                <div className="flex gap-1 items-center overflow-hidden">
                  <div className="flex gap-1 items-center overflow-hidden">
                    {selected.slice(0, 2).map((value) => (
                      <Badge
                        variant="secondary"
                        key={value}
                        className="shrink-0"
                      >
                        {value}
                      </Badge>
                    ))}
                    {selected.length > 2 && (
                      <Badge variant="secondary" className="shrink-0">
                        +{selected.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search..." />
              <CommandEmpty>No items found.</CommandEmpty>
              <CommandGroup className="max-h-[200px] overflow-auto">
                {sortedUniqueValues.map((value) => (
                  <CommandItem
                    key={value}
                    onSelect={() => {
                      const newSelected = selected.includes(value)
                        ? selected.filter((v) => v !== value)
                        : [...selected, value]
                      column.setFilterValue(
                        newSelected.length ? newSelected : undefined,
                      )
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selected.includes(value) ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {value}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return filterVariant === 'range' ? (
    <div className="space-y-1.5 sm:space-y-2">
      <div className="flex space-x-2">
        <DebouncedInput
          type="number"
          min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
          max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
          value={(columnFilterValue as [number, number])?.[0] ?? ''}
          onChange={(value) =>
            column.setFilterValue((old: [number, number]) => [value, old?.[1]])
          }
          placeholder={`Min ${
            column.getFacetedMinMaxValues()?.[0] !== undefined
              ? `(${column.getFacetedMinMaxValues()?.[0]})`
              : ''
          }`}
          className="w-full min-w-[100px] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <DebouncedInput
          type="number"
          min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
          max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
          value={(columnFilterValue as [number, number])?.[1] ?? ''}
          onChange={(value) =>
            column.setFilterValue((old: [number, number]) => [old?.[0], value])
          }
          placeholder={`Max ${
            column.getFacetedMinMaxValues()?.[1]
              ? `(${column.getFacetedMinMaxValues()?.[1]})`
              : ''
          }`}
          className="w-full min-w-[100px] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
    </div>
  ) : filterVariant === 'select' ? (
    <div className="space-y-1.5 sm:space-y-2">
      <Select
        value={columnFilterValue?.toString() ?? 'all'}
        onValueChange={(value) =>
          column.setFilterValue(value === 'all' ? '' : value)
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {sortedUniqueValues.map((value) => (
            <SelectItem key={value} value={value.toString()}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : (
    <div className="space-y-1.5 sm:space-y-2">
      <DebouncedInput
        type="text"
        value={(columnFilterValue ?? '') as string}
        onChange={(value) => column.setFilterValue(value)}
        placeholder={'Filter ...'}
        className="w-full"
        list={`${column.id}list`}
      />
    </div>
  )
}

// Update DebouncedInput to use Shadcn Input
function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const [value, setValue] = React.useState(initialValue)

  React.useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value])

  const handleClear = () => {
    setValue('')
    onChange('')
  }

  return (
    <div className="relative">
      <Input
        {...props}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`${props.className || ''} ${value ? 'pr-8' : ''} placeholder:text-sm`}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2"
          onClick={handleClear}
        >
          ✕
        </Button>
      )}
    </div>
  )
}
