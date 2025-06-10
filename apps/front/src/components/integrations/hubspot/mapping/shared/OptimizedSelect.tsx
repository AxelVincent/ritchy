import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useDebounce } from '@/hooks/useDebounce'
import type { FieldConfig } from '@ritchy/types'
import { useVirtualizer } from '@tanstack/react-virtual'
import { RefreshCw } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'

type HubspotProperty = {
  type: string
  name: string
  label: string
  archived?: boolean
}

type OptimizedSelectProps = {
  currentValue?: string
  defaultField: string
  onValueChange: (value: string) => void
  properties?:
    | {
        companyProperties?: HubspotProperty[]
        contactProperties?: HubspotProperty[]
      }
    | { error: string }
  isStatusField?: boolean
  statusOptions?: { value: string; label: string }[]
}

type HubspotSelectItem = HubspotProperty | { value: string; label: string }

// Add type guard
const isStatusItem = (
  item: HubspotSelectItem,
): item is { value: string; label: string } => 'value' in item

const OptimizedSelect = ({
  currentValue,
  defaultField,
  onValueChange,
  properties,
  isStatusField,
  statusOptions,
}: OptimizedSelectProps) => {
  const [search, setSearch] = useState('')
  const [_isOpen, setIsOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 1000)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [_isSearching, setIsSearching] = useState(false)

  // Reset search when dropdown opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      setSearch('')
      setIsSearching(false)
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
    }
  }

  // Handle search input changes
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation()
      setSearch(e.target.value)
    },
    [],
  )

  // Memoize the search input to prevent re-renders
  const searchInput = useMemo(
    () => (
      <Input
        ref={searchInputRef}
        placeholder="Search properties..."
        value={search}
        onChange={handleSearchChange}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
        onBlur={(e) => e.stopPropagation()}
        className="h-8"
      />
    ),
    [search, handleSearchChange],
  ) // Only re-render when search changes

  // Add this new useMemo for stable display value
  const currentDisplayValue = useMemo(() => {
    if (!currentValue) return ''

    if (isStatusField && statusOptions) {
      return (
        statusOptions.find((item) => item.value === currentValue)?.label ||
        currentValue
      )
    }

    if (!properties || 'error' in properties) return currentValue

    const props =
      properties.companyProperties || properties.contactProperties || []
    return (
      props.find((prop) => prop.name === currentValue)?.label || currentValue
    )
  }, [currentValue, isStatusField, statusOptions, properties])

  // Get the appropriate properties list - using ONLY debouncedSearch
  const items = useMemo(() => {
    if (isStatusField && statusOptions) {
      if (!debouncedSearch) {
        return statusOptions
      }
      return statusOptions.filter((item) =>
        item.label.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    }

    if (!properties || 'error' in properties) return []

    const props =
      properties.companyProperties || properties.contactProperties || []
    const filtered = props.filter((prop) => !prop.archived)

    if (!debouncedSearch) {
      return filtered
    }
    return filtered.filter(
      (prop) =>
        prop.label.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        prop.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
    )
  }, [properties, isStatusField, statusOptions, debouncedSearch])

  // Virtualization setup
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
    overscan: 5,
  })

  return (
    <Select
      value={currentValue || ''}
      onValueChange={onValueChange}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger className="w-full">
        <SelectValue>{currentDisplayValue}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 pb-2">{searchInput}</div>
        <div
          ref={parentRef}
          className="max-h-[300px] overflow-auto"
          style={{
            height: `${Math.min(items.length * 35, 300)}px`,
          }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = items[virtualRow.index]
              const isDefault = isStatusField
                ? isStatusItem(item) && item.value === defaultField
                : !isStatusItem(item) && item.name === defaultField

              return (
                <SelectItem
                  key={isStatusItem(item) ? item.value : item.name}
                  value={isStatusItem(item) ? item.value : item.name}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {item.label}
                  {isDefault && ' (Default)'}
                </SelectItem>
              )
            })}
          </div>
        </div>
      </SelectContent>
    </Select>
  )
}

type FieldMappingProps = {
  field: string
  config: FieldConfig
  defaultField: string
  mapping?: { hubspotField: string }
  isLoading: boolean
  onMappingChange: (field: string, value: string) => void
  properties?:
    | {
        companyProperties?: HubspotProperty[]
        contactProperties?: HubspotProperty[]
      }
    | { error: string }
  isStatusField?: boolean
  statusOptions?: { value: string; label: string }[]
}

export const FieldMapping = ({
  field,
  config,
  defaultField,
  mapping,
  isLoading,
  onMappingChange,
  properties,
  isStatusField,
  statusOptions,
}: FieldMappingProps) => {
  const currentValue = mapping?.hubspotField
  const showResetButton = currentValue && currentValue !== defaultField

  return (
    <div className="flex items-center gap-4 w-full">
      <div className="w-1/3 flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-medium">{config.displayName}</span>
          {config.description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help">?</span>
              </TooltipTrigger>
              <TooltipContent>{config.description}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <div className="w-2/3 flex items-center gap-2">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <>
            <OptimizedSelect
              currentValue={currentValue}
              defaultField={defaultField}
              onValueChange={(value) => onMappingChange(field, value)}
              properties={properties}
              isStatusField={isStatusField}
              statusOptions={statusOptions}
            />
            {showResetButton && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onMappingChange(field, defaultField)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset to Default</TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </div>
  )
}
