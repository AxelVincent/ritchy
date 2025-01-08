import '@tanstack/react-table'

declare module '@tanstack/react-table' {
  interface ColumnMeta {
    headerClassName?: string
    cellClassName?: string
    label?: string
    filterVariant?: 'text' | 'range' | 'select' | 'multi-select'
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
