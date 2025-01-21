import '@tanstack/react-table'

declare module '@tanstack/react-table' {
  interface ColumnMeta {
    headerClassName?: string
    cellClassName?: string
    label?: string
    filterVariant?: 'text' | 'range' | 'select' | 'multi-select'
    getFacetedUniqueValues?: (rows: RowData[]) => string[]
  }

  interface TableMeta {
    setSelectedPlaceId?: (placeId: string) => void
    hoveredRowId?: string | null
    onCellHover?: (
      id: string,
      displayName: string,
      element: HTMLElement,
    ) => void
    onCellLeave?: () => void
  }

  interface FilterFns {
    inDateRange?: FilterFn<unknown>
    arrSome?: FilterFn<unknown>
    multiSelectFilterFn?: FilterFn<unknown>
  }

  // https://github.com/TanStack/table/discussions/4554
  interface ColumnFiltersOptions<TData extends RowData> {
    filterFns?: Record<string, FilterFn<TData>>
  }
}
