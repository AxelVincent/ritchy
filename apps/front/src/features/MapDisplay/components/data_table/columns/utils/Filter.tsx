import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
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
import { DebouncedInput } from '../hooks/DebouncedInput'
import { useUniqueValues } from '../hooks/UseUniqueValues'
import type { FilterVariant } from '../types'

export function Filter({
  column,
}: {
  column: Column<SearchResult>
}) {
  const { filterVariant } = column.columnDef.meta ?? {}

  const columnFilterValue = column.getFilterValue()

  const sortedUniqueValues = useUniqueValues(
    column,
    filterVariant as FilterVariant,
  )

  const renderMultiSelect = () => {
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

  const renderRange = () => (
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
  )

  const renderSelect = () => (
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
  )

  const renderText = () => (
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

  switch (filterVariant) {
    case 'multi-select':
      return renderMultiSelect()
    case 'range':
      return renderRange()
    case 'select':
      return renderSelect()
    default:
      return renderText()
  }
}
