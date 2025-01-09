import { TextWrapper } from '@/components/common/TextWrapper'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DataExport } from '@/features/MapDisplay/components/data_export/DataExport'
import { AddItemsToListDialog } from '@/features/lists/components/AddItemsToListDialog'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@ritchy/types'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
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
import { useEffect, useState } from 'react'
import { DeleteItemsFromListDialog } from '../../../lists/components/DeleteItemsFromListDialog'
import { ActiveFilters } from './ActiveFilters'
import { ColumnsSelection } from './ColumnsSelection'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowSelect: React.Dispatch<React.SetStateAction<string | null>>
  setDataTableRowSelection: React.Dispatch<
    React.SetStateAction<RowSelectionState>
  >
  dataTableRowSelection: RowSelectionState
  mapBoxSelectedPlaceId: string | null
  mapBoxHoveredPlaceId: string | null
  listId?: string
}

// Add a fixed height for table rows
const ROW_HEIGHT = '40px' // Adjust this value as needed

export const DataTable = <TData extends SearchResult, TValue>({
  columns,
  data,
  mapBoxSelectedPlaceId,
  onRowSelect,
  mapBoxHoveredPlaceId,
  setDataTableRowSelection,
  dataTableRowSelection,
  listId,
}: DataTableProps<TData, TValue>) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [showAddListDialog, setShowAddListDialog] = useState(false)
  const [showDeleteListDialog, setShowDeleteListDialog] = useState(false)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
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
      rowSelection: dataTableRowSelection,
    },
  })

  // Get the selected rows data
  const selectedRows = table.getSelectedRowModel().rows

  const handleRowInteraction = (row: Row<TData>) => {
    if (mapBoxSelectedPlaceId === row.original.id) {
      onRowSelect(null)
    } else {
      onRowSelect(row.original.id)
    }
  }

  const handleRowClick = (
    e: React.MouseEvent,
    row: Row<TData>,
    isFirstColumn: boolean,
  ) => {
    // Return early if it's the first column or if the click is on an interactive element
    if (
      isFirstColumn ||
      (e.target instanceof Element &&
        (e.target.closest('button') ||
          e.target.closest('a') ||
          e.target.closest('[role="button"]')))
    ) {
      return
    }

    handleRowInteraction(row)
  }

  // Add this effect to handle scrolling
  useEffect(() => {
    if (mapBoxSelectedPlaceId) {
      const selectedRow = document.querySelector(
        `tr[data-id="${mapBoxSelectedPlaceId}"]`,
      )
      selectedRow?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [mapBoxSelectedPlaceId])

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row justify-between items-center p-4 gap-2">
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
                    Add {selectedRows.length} item(s) to list
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteListDialog(true)}
                  >
                    Remove {selectedRows.length} items
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
                  Add {selectedRows.length} item(s) to list
                </Button>
              )}
            </>
          )}
          <div className="flex items-center gap-2">
            <DataExport
              data={table.getFilteredRowModel().rows.map((row) => row.original)}
            />
            <ColumnsSelection table={table} />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-scroll min-h-0 min-w-0 border">
        <div className="w-[100px] h-[100px]">
          <table className="w-full border-collapse ">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header, idx) => {
                    return (
                      <th
                        scope="col"
                        key={header.id}
                        className={cn(
                          header.column.columnDef.meta?.headerClassName,
                          'px-4 py-0 border-b border-r sticky top-0 z-10 bg-background text-secondary-foreground font-medium',
                          idx === 0 && 'sticky left-0 z-20',
                        )}
                      >
                        <TextWrapper width="100%">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TextWrapper>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const backgroundClasses = cn(
                    'bg-background',
                    mapBoxHoveredPlaceId === row.original.id &&
                      'bg-gray-50 dark:bg-gray-900',
                    mapBoxSelectedPlaceId === row.original.id &&
                      'bg-gray-50 dark:bg-gray-900',
                  )

                  return (
                    <tr
                      key={row.original.id}
                      data-id={row.original.id}
                      data-state={row.getIsSelected() && 'selected'}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleRowInteraction(row)
                        }
                      }}
                      tabIndex={0}
                      className={cn(backgroundClasses)}
                      style={{ height: ROW_HEIGHT }}
                    >
                      {row.getVisibleCells().map((cell, idx) => (
                        <td
                          key={cell.id}
                          onClick={(e) => handleRowClick(e, row, idx === 0)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleRowClick(
                                e as unknown as React.MouseEvent,
                                row,
                                idx === 0,
                              )
                            }
                          }}
                          className={cn(
                            'px-4 py-1 whitespace-nowrap border-b border-r overflow-hidden',
                            idx === 0 &&
                              cn('sticky left-0 z-10', backgroundClasses),
                          )}
                          style={{ height: ROW_HEIGHT }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
