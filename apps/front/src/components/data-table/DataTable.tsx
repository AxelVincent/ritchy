import { useBatchEnrichmentStatus } from '@/api/queries/enrichment/useBatchEnrichmentStatus'
import { DataExport } from '@/components/data-export/DataExport'
import { useMapStore } from '@/components/map-display/store/useMapStore'
import { Label } from '@/components/ui/label'
import { useBatchEnrichmentWebSocket } from '@/hooks/useBatchEnrichmentWebSocket'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@ritchy/types'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ListManagementButtons } from '../lists/ListManagementButtons'
import { ActiveFilters } from './ActiveFilters'
import { ColumnsSelection } from './ColumnsSelection'
import { EnrichmentButtons } from './enrich/EnrichmentButtons'
import { EnrichmentCell } from './enrich/EnrichmentCell'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  setDataTableRowSelection: React.Dispatch<
    React.SetStateAction<RowSelectionState>
  >
  dataTableRowSelection: RowSelectionState
  listId?: string
  searchId?: string
  onFilteredDataChange: (ids: Set<string>) => void
  storageKey?: string
  isMobile?: boolean
}

// Add a fixed height for table rows
const ROW_HEIGHT = '40px'

export const DataTable = <TData extends SearchResult, TValue>({
  columns,
  data,
  setDataTableRowSelection,
  dataTableRowSelection,
  listId,
  searchId,
  onFilteredDataChange,
  storageKey,
  isMobile,
}: DataTableProps<TData, TValue>) => {
  // Get selectedPlaceId from the store
  const { selectedPlaceId, selectionSource } = useMapStore()
  // console.log('data', data)
  const dataRef = useRef(data)
  useEffect(() => {
    if (dataRef.current !== data) {
      console.log('⚠️ data prop changed (new reference)')
      dataRef.current = data
    }
  }, [data])
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnOrder, setColumnOrder] = useState<string[]>([])

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
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: setDataTableRowSelection,
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    getRowId: (row) => row.id,
    defaultColumn: {
      minSize: 60,
      maxSize: 800,
      filterFn: (row, columnId, filterValue) => {
        const column = table.getColumn(columnId)
        const value = row.getValue(columnId)

        switch (column?.columnDef.meta?.filterVariant) {
          case 'multi-select':
            return (
              (filterValue as string[]).length === 0 ||
              (filterValue as string[]).includes(value as string)
            )

          case 'select':
            return !filterValue || value === filterValue

          case 'range': {
            const [min, max] = filterValue as [number, number]
            const numValue =
              value === '' || value === null || value === undefined
                ? 0
                : Number(value)
            return (!min || numValue >= min) && (!max || numValue <= max)
          }

          case 'text':
            return (
              !filterValue ||
              String(value)
                .toLowerCase()
                .includes(String(filterValue).toLowerCase())
            )

          default:
            return true
        }
      },
    },
    columnResizeMode: 'onChange',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      columnOrder,
      rowSelection: dataTableRowSelection,
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

  // Batch enrichment status fetching for visible rows
  // Memoize visible place IDs to prevent unnecessary refetches
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const visiblePlaceIds = useMemo(
    () => virtualRows.map((vRow) => rows[vRow.index].original.id),
    [virtualRows.map((vr) => vr.index).join(','), rows.length],
  )

  // Fetch batch enrichment status for all visible rows
  const { data: batchStatus } = useBatchEnrichmentStatus(visiblePlaceIds)

  // Subscribe to WebSocket updates for visible rows
  useBatchEnrichmentWebSocket(visiblePlaceIds)

  // Track if we've already scrolled to the selected place
  const hasScrolledToSelection = useRef<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (selectedPlaceId && rows.length > 0) {
      // Only auto-scroll if selection came from the map, not the table
      if (selectionSource === 'table') {
        return
      }

      // Only auto-scroll if:
      // 1. This is a new selection (selectedPlaceId changed)
      // 2. We haven't already scrolled to this selection
      if (hasScrolledToSelection.current === selectedPlaceId) {
        return // Already scrolled to this selection, don't interrupt user
      }

      const selectedRowIndex = rows.findIndex(
        (row) => row.original.id === selectedPlaceId,
      )

      if (selectedRowIndex !== -1) {
        // Scroll to the selected row
        rowVirtualizer.scrollToIndex(selectedRowIndex, {
          align: 'start',
          behavior: 'auto',
        })
        // Mark that we've scrolled to this selection
        hasScrolledToSelection.current = selectedPlaceId
      }
    }

    // Reset tracking when selection is cleared
    if (!selectedPlaceId) {
      hasScrolledToSelection.current = null
    }
  }, [selectedPlaceId, selectionSource, rows.length, rowVirtualizer])

  // Memoize filtered IDs calculation
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const filteredIds = useMemo(() => {
    return new Set(
      table.getFilteredRowModel().rows.map((row) => row.original.id),
    )
  }, [table.getFilteredRowModel().rows.length])

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

  // Note: Cleanup of completed enrichments is now handled automatically
  // by useActiveEnrichments hook with event-driven timeouts (see useActiveEnrichments.ts:67-113)

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
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row justify-between items-center md:p-4 p-2 md:gap-2 gap-1 overflow-x-auto md:pl-2 pl-2">
          <div className="flex md:gap-2 gap-1">
            <EnrichmentButtons
              table={table}
              listId={listId}
              searchId={searchId}
            />
            <ListManagementButtons table={table} listId={listId} />
          </div>
          <div className="flex md:gap-2 gap-1">
            {!isMobile && (
              <DataExport
                selectedRows={
                  table.getSelectedRowModel().rows.length > 0
                    ? table
                        .getSelectedRowModel()
                        .rows.map((row) => row.original)
                    : table
                        .getFilteredRowModel()
                        .rows.map((row) => row.original)
                }
              />
            )}
            <ColumnsSelection table={table} storageKey={storageKey} />
          </div>
        </div>
      </div>
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

              return (
                <tr
                  data-index={virtualRow.index}
                  ref={(node) => rowVirtualizer.measureElement(node)}
                  key={row.id}
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    transform: `translateY(${virtualRow.start}px)`,
                    width: '100%',
                    height: ROW_HEIGHT,
                  }}
                  className="border-b border-border/60 group/row hover:bg-accent/50 transition-colors duration-150"
                >
                  {visibleCells.map((cell) => {
                    const isEnrichmentCell =
                      cell.column.columnDef.meta?.isEnrichment

                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          'border-r border-border/60 relative transition-colors duration-150 group-hover/row:[&.sticky-cell]:bg-[color-mix(in_srgb,hsl(var(--accent))_50%,hsl(var(--background)))]',
                          {
                            'bg-background sticky-cell':
                              cell.column.id === visibleCells[0].column.id &&
                              selectedPlaceId !== row.original.id,
                            'border-l-2 border-l-primary':
                              cell.column.id === visibleCells[0].column.id &&
                              selectedPlaceId === row.original.id,
                            'bg-primary/5':
                              cell.column.id !== visibleCells[0].column.id &&
                              selectedPlaceId === row.original.id,
                          },
                        )}
                        style={{
                          display: 'flex',
                          width: cell.column.getSize(),
                          position:
                            cell.column.id === visibleCells[0].column.id
                              ? 'sticky'
                              : 'relative',
                          left:
                            cell.column.id === visibleCells[0].column.id
                              ? 0
                              : undefined,
                          zIndex:
                            cell.column.id === visibleCells[0].column.id
                              ? selectedPlaceId === row.original.id
                                ? 2
                                : 1
                              : 0,
                          alignItems: 'center',
                          backgroundColor:
                            cell.column.id === visibleCells[0].column.id &&
                            selectedPlaceId === row.original.id
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
                                    row.original.enrichedStatus === 'ENRICHED',
                                  'text-red-600':
                                    row.original.enrichedStatus ===
                                    'ENRICHMENT_ERROR',
                                })}
                                aria-label={
                                  row.original.enrichedStatus ===
                                  'RECENTLY_ENRICHED'
                                    ? 'Recently enriched'
                                    : row.original.enrichedStatus === 'ENRICHED'
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
      {!isMobile && (
        <div className="flex justify-between items-center p-4 gap-4">
          <Label className="flex-shrink-0">
            {table.getRowModel().rows.length} Results
          </Label>
          <div className="flex-1 min-w-0">
            <ActiveFilters table={table} />
          </div>
        </div>
      )}
    </div>
  )
}
