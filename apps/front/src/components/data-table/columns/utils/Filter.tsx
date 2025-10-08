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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { DynamicBadgeList } from '@/components/common/DynamicBadgeList'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@ritchy/types'
import type { Column } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Check, X } from 'lucide-react'
import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
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

  const sortedUniqueValues =
    useUniqueValues(column, filterVariant as FilterVariant) ?? []

  const getFilterTooltip = (
    variant: FilterVariant,
    column: Column<SearchResult>,
  ) => {
    switch (variant) {
      case 'multi-select':
        return 'Select multiple values to filter by. Click to add or remove items.'
      case 'range': {
        const [min, max] = column.getFacetedMinMaxValues() ?? []
        return `Enter a number between ${min} and ${max}. Leave empty to remove limits.`
      }
      case 'select':
        return 'Choose one option to filter by.'
      case 'date-range':
        return 'Select a date range to filter by.'
      default:
        return 'Type to filter by text content.'
    }
  }

  const renderMultiSelect = () => {
    const selected = Array.isArray(columnFilterValue) ? columnFilterValue : []
    const [showTooltip, setShowTooltip] = useState(false)

    const safeUniqueValues = Array.isArray(sortedUniqueValues)
      ? sortedUniqueValues
      : []

    return (
      <TooltipProvider>
        <Tooltip open={showTooltip}>
          <TooltipTrigger asChild>
            <div
              className="space-y-1.5 sm:space-y-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Popover onOpenChange={() => setShowTooltip(false)}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full max-w-[200px] overflow-hidden justify-between relative group hover:bg-transparent text-muted-foreground"
                    style={{ direction: 'rtl' }}
                  >
                    {selected.length > 0 && (
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          column.setFilterValue(undefined)
                        }}
                        className="h-6 w-6 flex items-center justify-center "
                        size="icon"
                      >
                        <X className="opacity-50 hover:opacity-100" />
                      </Button>
                    )}
                    <div className="flex-1" style={{ direction: 'ltr' }}>
                      {selected.length === 0 && 'Select...'}
                      {selected.length > 0 && (
                        <DynamicBadgeList
                          items={selected}
                          badgeVariant="secondary"
                          containerPadding={60}
                          characterWidth={4}
                        />
                      )}
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-[var(--trigger-width)]"
                  style={{ minWidth: 'var(--trigger-width)' }}
                  align="start"
                  sideOffset={4}
                >
                  <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandEmpty>No items found.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-auto">
                      {safeUniqueValues.map((value) => (
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
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selected.includes(value)
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          {String(value)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {getFilterTooltip('multi-select', column)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const renderRange = () => {
    const [min, max] = (columnFilterValue as [number | '', number | '']) ?? []
    const isInvalid =
      min !== undefined &&
      max !== undefined &&
      min > max &&
      min !== '' &&
      max !== ''
    const hasValue = min || max
    const [showTooltip, setShowTooltip] = useState(false)

    return (
      <TooltipProvider>
        <Tooltip open={showTooltip}>
          <TooltipTrigger asChild>
            <div
              className="space-y-1.5 sm:space-y-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <div className="relative">
                    <DebouncedInput
                      type="number"
                      min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
                      max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
                      value={(columnFilterValue as [number, number])?.[0] ?? ''}
                      onChange={(value) =>
                        column.setFilterValue((old: [number, number]) => [
                          value,
                          old?.[1],
                        ])
                      }
                      placeholder={`Min ${
                        column.getFacetedMinMaxValues()?.[0] !== undefined
                          ? `(${column.getFacetedMinMaxValues()?.[0]})`
                          : ''
                      }`}
                      className={cn(
                        'w-full min-w-[60px] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                        isInvalid && 'border-red-500',
                      )}
                    />
                    {hasValue && (
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          column.setFilterValue(undefined)
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center"
                        size="icon"
                      >
                        <X className="opacity-50 hover:opacity-100" />
                      </Button>
                    )}
                  </div>
                  {isInvalid && (
                    <p className="text-xs text-red-500 mt-1">
                      Min cannot exceed max
                    </p>
                  )}
                </div>
                <div className="relative flex-1">
                  <DebouncedInput
                    type="number"
                    min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
                    max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
                    value={(columnFilterValue as [number, number])?.[1] ?? ''}
                    onChange={(value) =>
                      column.setFilterValue((old: [number, number]) => [
                        old?.[0],
                        value,
                      ])
                    }
                    placeholder={`Max ${
                      column.getFacetedMinMaxValues()?.[1]
                        ? `(${column.getFacetedMinMaxValues()?.[1]})`
                        : ''
                    }`}
                    className="w-full min-w-[60px] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>{getFilterTooltip('range', column)}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const renderSelect = () => (
    <div className="space-y-1.5 sm:space-y-2">
      <div className="relative">
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
            {(sortedUniqueValues || []).map((value) => (
              <SelectItem key={value} value={value.toString()}>
                {value as string}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {columnFilterValue !== undefined && columnFilterValue !== '' && (
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              column.setFilterValue(undefined)
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center"
            size="icon"
          >
            <X className="opacity-50 hover:opacity-100" />
          </Button>
        )}
      </div>
    </div>
  )

  const renderDateRange = () => {
    const [from, to] = (columnFilterValue as [
      Date | undefined,
      Date | undefined,
    ]) ?? [undefined, undefined]
    const [showTooltip, setShowTooltip] = useState(false)

    return (
      <TooltipProvider>
        <Tooltip open={showTooltip}>
          <TooltipTrigger asChild>
            <div
              className="space-y-1.5 sm:space-y-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <div className="flex flex-row gap-2 sm:flex-row sm:items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'w-full sm:w-[130px] justify-start text-left font-normal truncate',
                        !from && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {from ? format(from, 'PP') : 'From date'}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={from}
                      onSelect={(date) =>
                        column.setFilterValue(
                          (old: [Date | undefined, Date | undefined]) => [
                            date,
                            old?.[1],
                          ],
                        )
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'w-full sm:w-[130px] justify-start text-left font-normal truncate',
                        !to && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {to ? format(to, 'PP') : 'To date'}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={to}
                      onSelect={(date) =>
                        column.setFilterValue(
                          (old: [Date | undefined, Date | undefined]) => [
                            old?.[0],
                            date,
                          ],
                        )
                      }
                      initialFocus
                      disabled={(date) => date < (from ?? new Date(0))}
                    />
                  </PopoverContent>
                </Popover>
                {(from || to) && (
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      column.setFilterValue(undefined)
                    }}
                    className="h-8 w-8 p-0 sm:self-start"
                    size="icon"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {getFilterTooltip('date-range', column)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const renderText = () => (
    <div className="space-y-1.5 sm:space-y-2">
      <div className="relative">
        <DebouncedInput
          type="text"
          value={(columnFilterValue ?? '') as string}
          onChange={(value) => column.setFilterValue(value)}
          placeholder={'Filter ...'}
          className="w-full"
          list={`${column.id}list`}
        />
        {columnFilterValue !== undefined && columnFilterValue !== '' && (
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              column.setFilterValue(undefined)
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center"
            size="icon"
          >
            <X className="opacity-50 hover:opacity-100" />
          </Button>
        )}
      </div>
    </div>
  )

  switch (filterVariant) {
    case 'multi-select':
      return renderMultiSelect()
    case 'range':
      return renderRange()
    case 'select':
      return renderSelect()
    case 'date-range':
      return renderDateRange()
    default:
      return renderText()
  }
}
