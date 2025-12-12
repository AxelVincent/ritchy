import { useBatchEnrichmentStatus } from '@/api/queries/enrichment/useBatchEnrichmentStatus'
import { FilterBar } from '@/components/filters/FilterBar'
import { useBatchEnrichmentWebSocket } from '@/hooks/useBatchEnrichmentWebSocket'
import { useTableKeyboardShortcuts } from '@/hooks/useTableKeyboardShortcuts'
import { cn } from '@/lib/utils'
import type {
  ContentFilters,
  FilterRule,
  ListFilterOptions,
  PaginationMeta,
  SearchResult,
  SortOrder,
} from '@ritchy/types'
import {
  type ColumnDef,
  type SortingState,
  type Table,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ColumnsSelection } from './ColumnsSelection'
import { DataTableToolbar } from './DataTableToolbar'
import { MobileCardList } from './MobileCardList'
import { Pagination } from './Pagination'
import { EnrichmentCell } from './enrich/EnrichmentCell'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  listId?: string
  searchId?: string
  onFilteredDataChange: (ids: Set<string>) => void
  storageKey?: string
  isMobile?: boolean
  // Server-side mode props
  serverSide?: boolean
  onSortingChange?: (sorting: SortingState) => void
  // External state for server-side mode
  externalSorting?: SortingState
  // Selection props (from useMarkerSelection hook)
  selectedPlaceId?: string | null
  onRowClick?: (placeId: string) => void
  shouldScrollToSelection?: boolean
  onScrollComplete?: () => void
  // Filter props
  filterRules?: FilterRule[]
  onFilterRulesChange?: (rules: FilterRule[]) => void
  filterOptions?: ListFilterOptions
  filterOptionsLoading?: boolean
  // Pagination props
  pagination?: PaginationMeta
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  isLoading?: boolean
  // Export props (for toolbar)
  filters?: ContentFilters
  sortBy?: string
  sortOrder?: SortOrder
  // Table selection props - passed via context now, but we need selectAll for keyboard shortcuts
  onSelectAll?: () => void
}

// Add a fixed height for table rows
const ROW_HEIGHT = '40px'

export const DataTable = <TData extends SearchResult, TValue>({
  columns,
  data,
  listId,
  searchId,
  onFilteredDataChange,
  storageKey,
  isMobile,
  // Server-side mode props
  serverSide = false,
  onSortingChange,
  externalSorting,
  // Selection props
  selectedPlaceId,
  onRowClick,
  shouldScrollToSelection,
  onScrollComplete,
  // Filter props
  filterRules,
  onFilterRulesChange,
  filterOptions,
  filterOptionsLoading,
  // Pagination props
  pagination,
  onPageChange,
  onPageSizeChange,
  isLoading,
  // Export props
  filters,
  sortBy,
  sortOrder,
  // Table selection
  onSelectAll,
}: DataTableProps<TData, TValue>) => {
  // Use external state in server-side mode, internal state otherwise
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnOrder, setColumnOrder] = useState<string[]>([])

  // Ref to store the add filter callback from FilterBar
  const openAddFilterRef = useRef<(() => void) | null>(null)

  // Resolve sorting based on mode
  const sorting =
    serverSide && externalSorting ? externalSorting : internalSorting

  // Handler for sorting change
  const handleSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const newSorting =
        typeof updater === 'function' ? updater(sorting) : updater
      if (serverSide && onSortingChange) {
        onSortingChange(newSorting)
      } else {
        setInternalSorting(newSorting)
      }
    },
    [serverSide, onSortingChange, sorting],
  )

  const localStorageKey = `tableColumnSizing_${storageKey || 'default'}`

  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(
    () => {
      const saved = localStorage.getItem(localStorageKey)
      return saved ? JSON.parse(saved) : {}
    },
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: handleSortingChange,
    getSortedRowModel: serverSide ? undefined : getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getRowId: (row) => row.id,
    // Server-side mode flags
    manualSorting: serverSide,
    defaultColumn: {
      minSize: 60,
      maxSize: 800,
    },
    columnResizeMode: 'onChange',
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnSizing,
    },
    onColumnSizingChange: (updater) => {
      const newSizing =
        typeof updater === 'function' ? updater(columnSizing) : updater
      setColumnSizing(newSizing)
      localStorage.setItem(localStorageKey, JSON.stringify(newSizing))
    },
  })

  const tableContainerRef = useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows
  const visibleColumns = table.getVisibleLeafColumns()

  // Row virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 40,
    getScrollElement: () => tableContainerRef.current,
    measureElement:
      typeof window !== 'undefined' &&
      navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 10,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()

  // Get all place IDs on current page for enrichment status
  // With pagination, page sizes are small (25-100), so we subscribe to all
  // biome-ignore lint/correctness/useExhaustiveDependencies: optimized dependency
  const pageUserPlaceIds = useMemo(
    () => data.map((item) => item.id),
    [data.map((item) => item.id).join(',')],
  )

  // Fetch batch enrichment status for all page rows
  const { data: batchStatus } = useBatchEnrichmentStatus(pageUserPlaceIds)

  // Subscribe to WebSocket updates for all page rows
  useBatchEnrichmentWebSocket(pageUserPlaceIds)

  // Scroll to selected row when shouldScrollToSelection is true
  useEffect(() => {
    if (!shouldScrollToSelection || !selectedPlaceId || rows.length === 0) {
      return
    }

    const selectedRowIndex = rows.findIndex(
      (row) => row.original.id === selectedPlaceId,
    )

    if (selectedRowIndex !== -1) {
      rowVirtualizer.scrollToIndex(selectedRowIndex, {
        align: 'start',
        behavior: 'auto',
      })
      onScrollComplete?.()
    }
  }, [
    shouldScrollToSelection,
    selectedPlaceId,
    rows,
    rowVirtualizer,
    onScrollComplete,
  ])

  // Memoize filtered IDs calculation
  // All filtering is now done server-side, so all data rows are "filtered"
  const filteredIds = useMemo(() => {
    return new Set(data.map((item) => item.id))
  }, [data])

  // Memoize callback to prevent unnecessary effect triggers
  const onFilteredDataChangeMemoized = useCallback(
    (ids: Set<string>) => {
      onFilteredDataChange(ids)
    },
    [onFilteredDataChange],
  )

  // Add effect to track filtered results
  useEffect(() => {
    onFilteredDataChangeMemoized(filteredIds)
  }, [filteredIds, onFilteredDataChangeMemoized])

  // Keyboard shortcuts for table interactions
  useTableKeyboardShortcuts({
    onAddFilter: () => openAddFilterRef.current?.(),
    onClearFilters: () => onFilterRulesChange?.([]),
    onNextPage: () => {
      if (pagination?.hasNextPage) {
        onPageChange?.(pagination.page + 1)
      }
    },
    onPrevPage: () => {
      if (pagination?.hasPreviousPage) {
        onPageChange?.(pagination.page - 1)
      }
    },
    onSelectAll: () => {
      onSelectAll?.()
    },
    enabled: !!filterRules,
  })

  // If there are no visible columns, show a message
  if (visibleColumns.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground mb-4">
          No columns are currently visible
        </p>
        <ColumnsSelection table={table} storageKey={storageKey} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-1 flex-col min-h-0',
        !isMobile && 'overflow-auto',
      )}
    >
      {/* Toolbar - desktop only */}
      {!isMobile && (
        <DataTableToolbar
          table={table as unknown as Table<SearchResult>}
          listId={listId}
          searchId={searchId}
          storageKey={storageKey}
          isMobile={isMobile}
          filters={filters}
          sortBy={sortBy}
          sortOrder={sortOrder}
          pagination={pagination}
        />
      )}

      {/* Filter Bar - positioned under toolbar */}
      {filterRules && onFilterRulesChange && (
        <FilterBar
          rules={filterRules}
          onRulesChange={onFilterRulesChange}
          filterOptions={filterOptions}
          filterOptionsLoading={filterOptionsLoading}
          resultsCount={data.length}
          onOpenAddFilter={(callback) => {
            openAddFilterRef.current = callback
          }}
          isMobile={isMobile}
          isLoading={isLoading}
        />
      )}

      {/* Mobile: Card List / Desktop: Data Table */}
      {isMobile ? (
        <MobileCardList
          data={data}
          selectedPlaceId={selectedPlaceId}
          onRowClick={onRowClick}
          isLoading={isLoading}
          listId={listId}
        />
      ) : (
        <div
          ref={tableContainerRef}
          className="border-t border-b border-border/60 p-0"
          style={{
            overflow: 'auto',
            position: 'relative',
            height: '100%',
          }}
        >
          <table style={{ display: 'grid' }} className="">
            <thead
              style={{
                display: 'grid',
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}
              className="bg-gradient-to-b from-background/95 to-background border-b border-border/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] backdrop-blur-sm"
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  style={{ display: 'flex', width: '100%' }}
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{
                        display: 'flex',
                        width: header.getSize(),
                        position: header.index === 0 ? 'sticky' : 'relative',
                        left: header.index === 0 ? 0 : undefined,
                        zIndex: header.index === 0 ? 2 : 1,
                      }}
                      className={cn(
                        'border-r border-border/60',
                        header.index === 0
                          ? 'bg-gradient-to-b from-background/95 to-background backdrop-blur-sm'
                          : 'bg-transparent',
                      )}
                    >
                      <div
                        {...{
                          className: header.column.getCanSort()
                            ? 'w-full cursor-pointer select-none'
                            : '',
                          onClick: header.column.getToggleSortingHandler(),
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </div>
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={cn(
                          'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none',
                          'hover:bg-primary transition-colors duration-150',
                          header.column.getIsResizing() ? 'bg-primary' : '',
                        )}
                      />
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody
              style={{
                display: 'grid',
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index]
                const visibleCells = row.getVisibleCells()
                const isSelected = selectedPlaceId === row.original.id

                return (
                  <tr
                    data-index={virtualRow.index}
                    ref={(node) => rowVirtualizer.measureElement(node)}
                    key={row.id}
                    onClick={() => onRowClick?.(row.original.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onRowClick?.(row.original.id)
                      }
                    }}
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? 'button' : undefined}
                    style={{
                      display: 'flex',
                      position: 'absolute',
                      transform: `translateY(${virtualRow.start}px)`,
                      width: '100%',
                      height: ROW_HEIGHT,
                      cursor: onRowClick ? 'pointer' : undefined,
                    }}
                    className="border-b border-border/60 group/row hover:bg-accent/50 transition-colors duration-150"
                  >
                    {visibleCells.map((cell) => {
                      const isEnrichmentCell =
                        cell.column.columnDef.meta?.isEnrichment
                      const isFirstColumn =
                        cell.column.id === visibleCells[0].column.id

                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            'border-r border-border/60 relative transition-colors duration-150 group-hover/row:[&.sticky-cell]:bg-[color-mix(in_srgb,hsl(var(--accent))_50%,hsl(var(--background)))]',
                            {
                              'bg-background sticky-cell':
                                isFirstColumn && !isSelected,
                              'border-l-2 border-l-primary':
                                isFirstColumn && isSelected,
                              'bg-primary/5': !isFirstColumn && isSelected,
                            },
                          )}
                          style={{
                            display: 'flex',
                            width: cell.column.getSize(),
                            position: isFirstColumn ? 'sticky' : 'relative',
                            left: isFirstColumn ? 0 : undefined,
                            zIndex: isFirstColumn ? (isSelected ? 2 : 1) : 0,
                            alignItems: 'center',
                            backgroundColor:
                              isFirstColumn && isSelected
                                ? 'color-mix(in srgb, hsl(var(--primary)) 5%, hsl(var(--background)))'
                                : undefined,
                          }}
                        >
                          {isEnrichmentCell ? (
                            <>
                              <div className="absolute top-1 right-1">
                                <Sparkles
                                  className={cn('h-2.5 w-2.5', {
                                    'text-purple-600':
                                      row.original.enrichedStatus ===
                                      'RECENTLY_ENRICHED',
                                    'text-blue-600':
                                      row.original.enrichedStatus ===
                                      'ENRICHED',
                                    'text-red-600':
                                      row.original.enrichedStatus ===
                                      'ENRICHMENT_ERROR',
                                  })}
                                  aria-label={
                                    row.original.enrichedStatus ===
                                    'RECENTLY_ENRICHED'
                                      ? 'Recently enriched'
                                      : row.original.enrichedStatus ===
                                          'ENRICHED'
                                        ? 'Previously enriched'
                                        : 'Enrichment error'
                                  }
                                />
                              </div>
                              <EnrichmentCell
                                userPlaceId={row.original.id}
                                status={batchStatus?.[row.original.id]}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </EnrichmentCell>
                            </>
                          ) : (
                            <>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination - positioned below table (desktop only, mobile uses MobileBottomBar) */}
      {serverSide && pagination && !isMobile && (
        <Pagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={isLoading}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}
