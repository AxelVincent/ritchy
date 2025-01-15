import { Button } from '@/components/ui/button'
import { toTitleCase } from '@/lib/toTitleCase'
import type { SearchResult } from '@ritchy/types'
import type { ColumnFiltersState, Table } from '@tanstack/react-table'
import { useMemo } from 'react'

interface ActiveFiltersProps<TData> {
  table: Table<TData>
}

const isValidFilterValue = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.some((v) => v !== null && v !== '')
  }
  return value !== null && value !== ''
}
type FilterValue = string | number | (string | number)[] | null

const formatFilterValue = (
  value: FilterValue,
  variant?: string,
): string | React.ReactNode => {
  if (variant === 'multi-select' && Array.isArray(value)) {
    return value.join(', ')
  }
  if (variant === 'range' && Array.isArray(value)) {
    const [min, max] = value as string[]
    return `[${min ?? ''}, ${max ?? ''}]`
  }
  return String(value)
}

const hasActiveFilters = (filters: ColumnFiltersState): boolean => {
  return filters.some((filter) => isValidFilterValue(filter.value))
}

export const ActiveFilters = <TData extends SearchResult>({
  table,
}: ActiveFiltersProps<TData>): React.ReactElement | null => {
  const columnFilters = table.getState().columnFilters

  const hasActiveFiltersValue = useMemo(
    () => hasActiveFilters(columnFilters),
    [columnFilters],
  )

  const activeFilters = useMemo(
    () => columnFilters.filter((filter) => isValidFilterValue(filter.value)),
    [columnFilters],
  )

  const handleClearFilters = (): void => {
    table.resetColumnFilters()
  }

  if (!hasActiveFiltersValue) return null

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0 overflow-x-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {activeFilters.map((filter) => {
            const column = table.getColumn(filter.id)
            const filterVariant = column?.columnDef.meta?.filterVariant
            const columnName = toTitleCase(filter.id)

            const formattedValue = formatFilterValue(
              filter.value as FilterValue,
              filterVariant,
            )

            return (
              <span
                key={filter.id}
                className="inline-flex items-center px-2 py-1 bg-muted rounded-md gap-1 whitespace-nowrap"
              >
                <span className="font-medium text-foreground">
                  {columnName}
                </span>
                <span className="text-muted-foreground">•</span>
                {isValidFilterValue(formattedValue) ? (
                  formattedValue
                ) : (
                  <span>{formattedValue}</span>
                )}
              </span>
            )
          })}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClearFilters}
        className="flex-shrink-0"
      >
        Clear Filters
      </Button>
    </div>
  )
}
