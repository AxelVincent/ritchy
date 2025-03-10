import { AddItemsToListDialog } from '@/components/lists/add-items-to-list-dialog'
import { DataExport } from '@/components/map-display/components/data_export/DataExport'
import { useMapStore } from '@/components/map-display/store/useMapStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'
import { MagicWandIcon } from '@radix-ui/react-icons'
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
import { Loader2, Plus, Trash } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DeleteItemsFromListDialog } from '../lists/delete-items-from-list-dialog'
import { ActiveFilters } from './ActiveFilters'
import { ColumnsSelection } from './ColumnsSelection'
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
  setData: React.Dispatch<React.SetStateAction<TData[]>>
}

// Add a fixed height for table rows
const ROW_HEIGHT = '34px'

export const DataTable = <TData extends SearchResult, TValue>({
  columns,
  data,
  setData,
  setDataTableRowSelection,
  dataTableRowSelection,
  listId,
  searchId,
  onFilteredDataChange,
}: DataTableProps<TData, TValue>) => {
  // Get selectedPlaceId and setSelectedPlaceId from the store
  const { selectedPlaceId, centerPlaceSpreadsheetId } = useMapStore()
  const isMobile = useMediaQuery('(max-width: 768px)')

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [showAddListDialog, setShowAddListDialog] = useState(false)
  const [showDeleteListDialog, setShowDeleteListDialog] = useState(false)

  // Use the enrichment hook
  const { pendingFetches, handleFetchEnrichment } = useEnrichment({
    data,
    setData,
    listId,
    searchId,
  })

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
    },
    meta: {
      setData,
    },
  })

  const tableContainerRef = useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows
  const visibleColumns = table.getVisibleLeafColumns()

  // Column virtualizer
  const columnVirtualizer = useVirtualizer({
    count: visibleColumns.length,
    estimateSize: () => 200,
    measureElement: () => 200,
    getScrollElement: () => tableContainerRef.current,
    horizontal: true,
    overscan: 8, // Increased for smoother horizontal scrolling
  })

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

  const virtualColumns = columnVirtualizer.getVirtualItems()
  const virtualRows = rowVirtualizer.getVirtualItems()

  // Calculate padding for columns
  let virtualPaddingLeft: number | undefined
  let virtualPaddingRight: number | undefined

  if (columnVirtualizer && virtualColumns?.length) {
    virtualPaddingLeft = virtualColumns[0]?.start ?? 0
    virtualPaddingRight =
      columnVirtualizer.getTotalSize() -
      (virtualColumns[virtualColumns.length - 1]?.end ?? 0)
  }

  // Get the selected rows data
  const selectedRows = table.getSelectedRowModel().rows

  // Add this effect to handle scrolling
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    // Find the index of the selected row in the full data set
    const rowIndex = rows.findIndex(
      (row) => row.original.id === centerPlaceSpreadsheetId,
    )
    if (rowIndex !== -1) {
      // First scroll without smooth behavior to ensure correct positioning
      rowVirtualizer.scrollToIndex(rowIndex, { align: 'center' })

      // Use requestAnimationFrame to ensure the initial scroll is complete
      requestAnimationFrame(() => {
        // Then apply smooth scrolling for visual polish
        rowVirtualizer.scrollToIndex(rowIndex, {
          align: 'center',
          behavior: 'smooth',
        })
      })
    }
  }, [centerPlaceSpreadsheetId])

  // Add effect to track filtered results
  // biome-ignore lint/correctness/useExhaustiveDependencies: biome doesn't support exhaustive deps
  useEffect(() => {
    const filteredIds = new Set(
      table.getFilteredRowModel().rows.map((row) => row.original.id),
    )
    onFilteredDataChange(filteredIds)
  }, [table.getFilteredRowModel().rows, onFilteredDataChange])

  // Replace the handleFetchEnrichment function with this wrapper
  const handleEnrichSelectedRows = () => {
    const selectedRows = table.getSelectedRowModel().rows
    const selectedIds = selectedRows
      .filter((row) => row.original.website)
      .map((row) => row.original.id)

    handleFetchEnrichment(selectedIds)
  }

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
        <div className="flex flex-row justify-between items-center p-4 gap-2 overflow-x-auto">
          {listId ? (
            <>
              <DeleteItemsFromListDialog
                open={showDeleteListDialog}
                onOpenChange={setShowDeleteListDialog}
                selectedItems={selectedRows.map((row) => row.original.id)}
                listId={listId}
              />
              <AddItemsToListDialog
                open={showAddListDialog}
                onOpenChange={setShowAddListDialog}
                selectedItems={selectedRows.map((row) => row.original.id)}
              />
              {selectedRows.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={() => setShowAddListDialog(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Add {selectedRows.length} lead
                    {selectedRows.length === 1 ? '' : 's'} to a list
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteListDialog(true)}
                  >
                    <Trash className="w-4 h-4" />
                    Remove {selectedRows.length} lead
                    {selectedRows.length === 1 ? '' : 's'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <AddItemsToListDialog
                open={showAddListDialog}
                onOpenChange={setShowAddListDialog}
                selectedItems={selectedRows.map((row) => row.original.id)}
              />
              {selectedRows.length > 0 && (
                <Button
                  variant="default"
                  onClick={() => setShowAddListDialog(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add {selectedRows.length} lead
                  {selectedRows.length === 1 ? '' : 's'} to a list
                </Button>
              )}
            </>
          )}
          {selectedRows.length > 0 &&
            selectedRows.some((row) => row.original.website) && (
              <Button
                variant="outline"
                onClick={handleEnrichSelectedRows}
                disabled={pendingFetches.size > 0}
              >
                {pendingFetches.size > 0 ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enriching ({pendingFetches.size} remaining)
                  </>
                ) : (
                  <>
                    <MagicWandIcon className="mr-2 h-4 w-4" />
                    Enrich (
                    {selectedRows.filter((row) => row.original.website).length})
                  </>
                )}
              </Button>
            )}
          {!isMobile && (
            <DataExport
              data={table.getFilteredRowModel().rows.map((row) => row.original)}
            />
          )}
          <ColumnsSelection table={table} />
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
                <th
                  key={headerGroup.headers[0].id}
                  style={{
                    display: 'flex',
                    width: headerGroup.headers[0].getSize(),
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                  }}
                  className="border-r border-border bg-background"
                >
                  {flexRender(
                    headerGroup.headers[0].column.columnDef.header,
                    headerGroup.headers[0].getContext(),
                  )}
                </th>
                {virtualPaddingLeft ? (
                  <th style={{ display: 'flex', width: virtualPaddingLeft }} />
                ) : null}
                {virtualColumns.map((vc) => {
                  const header = headerGroup.headers[vc.index + 1]
                  if (!header) return null
                  return (
                    <th
                      key={header.id}
                      style={{
                        display: 'flex',
                        width: header.getSize(),
                      }}
                      className={cn('border-r border-border bg-background', {
                        'bg-background': vc.index === 0,
                      })}
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
                    </th>
                  )
                })}
                {virtualPaddingRight ? (
                  <th style={{ display: 'flex', width: virtualPaddingRight }} />
                ) : null}
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
                  <td
                    key={visibleCells[0].id}
                    style={{
                      display: 'flex',
                      width: visibleCells[0].column.getSize(),
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      alignItems: 'center',
                    }}
                    className={cn('border-r border-border bg-background', {
                      'bg-primary-foreground':
                        selectedPlaceId === row.original.id,
                    })}
                  >
                    {flexRender(
                      visibleCells[0].column.columnDef.cell,
                      visibleCells[0].getContext(),
                    )}
                  </td>
                  {virtualPaddingLeft ? (
                    <td
                      style={{ display: 'flex', width: virtualPaddingLeft }}
                    />
                  ) : null}
                  {virtualColumns.map((vc) => {
                    const cell = visibleCells[vc.index + 1]
                    if (!cell) return null
                    return (
                      <td
                        key={cell.id}
                        style={{
                          display: 'flex',
                          width: cell.column.getSize(),
                          alignItems: 'center',
                        }}
                        className={cn('border-r border-border', {
                          'bg-background': vc.index === 0,
                          'bg-primary-foreground':
                            selectedPlaceId === row.original.id,
                        })}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    )
                  })}
                  {virtualPaddingRight ? (
                    <td
                      style={{ display: 'flex', width: virtualPaddingRight }}
                    />
                  ) : null}
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
