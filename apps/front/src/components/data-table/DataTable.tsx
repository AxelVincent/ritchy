import { DataExport } from '@/components/data-export/DataExport'
import { useMapStore } from '@/components/map-display/store/useMapStore'
import { Label } from '@/components/ui/label'
import { useIsMobile } from '@/hooks/use-mobile'
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
import { useEffect, useRef, useState } from 'react'
import { HubspotSyncManagementButtons } from '../integrations/hubspot/HubspotSyncManagementButtons'
import { ListManagementButtons } from '../lists/ListManagementButtons'
import { ActiveFilters } from './ActiveFilters'
import { ColumnsSelection } from './ColumnsSelection'
import { EnrichmentButtons } from './EnrichmentButtons'
import { useEnrichment } from './hooks/useEnrichment'

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
}

// Add a fixed height for table rows
const ROW_HEIGHT = '34px'

export const DataTable = <TData extends SearchResult, TValue>({
  columns,
  data,
  setDataTableRowSelection,
  dataTableRowSelection,
  listId,
  searchId,
  onFilteredDataChange,
  storageKey,
}: DataTableProps<TData, TValue>) => {
  // Get selectedPlaceId from the store
  const { selectedPlaceId } = useMapStore()
  const isMobile = useIsMobile()

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnOrder, setColumnOrder] = useState<string[]>([])

  // Use the simplified enrichment hook
  const {
    handleFetchEnrichment,
    isEnriching,
    enrichmentProgress,
    enrichmentData,
    enrichmentError,
  } = useEnrichment({
    listId,
    searchId,
  })

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

  // Add effect to track filtered results
  // biome-ignore lint/correctness/useExhaustiveDependencies: biome doesn't support exhaustive deps
  useEffect(() => {
    const filteredIds = new Set(
      table.getFilteredRowModel().rows.map((row) => row.original.id),
    )
    onFilteredDataChange(filteredIds)
  }, [table.getFilteredRowModel().rows, onFilteredDataChange])

  // If there are no visible columns, show a message
  if (visibleColumns.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground mb-4">
          No columns are currently visible
          <ColumnsSelection table={table} />
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row justify-between items-center p-4 gap-2 overflow-x-auto md:pl-2 pl-16 md:mt-0 mt-2">
          <div className="flex gap-2">
            <ListManagementButtons table={table} listId={listId} />
            <HubspotSyncManagementButtons table={table} />
          </div>
          <div className="flex gap-2">
            <EnrichmentButtons
              table={table}
              isEnriching={isEnriching}
              enrichmentProgress={enrichmentProgress}
              enrichmentData={enrichmentData}
              enrichmentError={enrichmentError}
              handleFetchEnrichment={handleFetchEnrichment}
            />
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
            <ColumnsSelection table={table} />
          </div>
        </div>
      </div>
      <div
        ref={tableContainerRef}
        className="border-t border-b border-border p-0"
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
            className="bg-background border-b"
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
                    className={cn('border-r border-border bg-background')}
                  >
                    <div className="w-full">
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
                        'hover:bg-primary',
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
                  className="border-b border-border"
                >
                  {visibleCells.map((cell) => (
                    <td
                      key={cell.id}
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
                          cell.column.id === visibleCells[0].column.id ? 1 : 0,
                        alignItems: 'center',
                      }}
                      className={cn('border-r border-border', {
                        'bg-background':
                          cell.column.id === visibleCells[0].column.id,
                        'bg-primary-foreground':
                          selectedPlaceId === row.original.id,
                      })}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center p-4 gap-4">
        <Label className="flex-shrink-0">
          {table.getRowModel().rows.length} Results
        </Label>
        <div className="flex-1 min-w-0">
          <ActiveFilters table={table} />
        </div>
      </div>
    </div>
  )
}
