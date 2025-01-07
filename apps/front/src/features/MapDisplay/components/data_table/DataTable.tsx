import { TextWrapper } from '@/components/common/TextWrapper'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { DataExport } from '@/features/MapDisplay/components/data_export/DataExport'
import { AddItemsToListDialog } from '@/features/MapDisplay/components/data_table/AddItemsToListDialog'
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
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DeleteItemsFromListDialog } from './DeleteItemsFromListDialog'

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
    getFacetedRowModel: getFacetedRowModel(), // client-side faceting
    getFacetedUniqueValues: getFacetedUniqueValues(), // generate unique values for select filter/autocomplete
    getFacetedMinMaxValues: getFacetedMinMaxValues(), // generate min/max values for range filter
    getRowId: (row) => row.id,
    defaultColumn: {
      minSize: 60,
      maxSize: 800,
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

  const handleRowClick = (e: React.MouseEvent, row: Row<TData>) => {
    // Ignore if the click target is an interactive element
    if (
      e.target instanceof Element &&
      (e.target.closest('button') ||
        e.target.closest('a') ||
        e.target.closest('[role="button"]'))
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
          <DataExport
            data={table.getFilteredRowModel().rows.map((row) => row.original)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id
                        .split(/(?=[A-Z])|(?:And)/)
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join(' ')}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex-1 overflow-scroll min-h-0 min-w-0 border">
        <div className="w-[100px] h-[100px]">
          <table className="border-separate border-spacing-0 min-w-full">
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
                          'px-4 py-0 border-b border-s-0 sticky top-0 z-10 bg-background text-secondary-foreground font-medium',
                          idx === 0 && 'sticky left-0 z-20 border-r border-s-0',
                        )}
                      >
                        <TextWrapper>
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
                      'bg-gray-100 dark:bg-gray-900',
                    mapBoxSelectedPlaceId === row.original.id &&
                      'bg-gray-100 dark:bg-gray-900',
                  )

                  return (
                    <tr
                      key={row.original.id}
                      data-id={row.original.id}
                      data-state={row.getIsSelected() && 'selected'}
                      onClick={(e) => handleRowClick(e, row)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleRowInteraction(row)
                        }
                      }}
                      tabIndex={0}
                      className={cn(backgroundClasses, 'cursor-pointer')}
                    >
                      {row.getVisibleCells().map((cell, idx) => (
                        <td
                          key={cell.id}
                          className={cn(
                            'px-4 py-1 whitespace-nowrap border-b border-s-0',
                            idx === 0 &&
                              cn(
                                'sticky left-0 z-10 border-r border-s-0',
                                backgroundClasses,
                              ),
                          )}
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
      <div className="flex justify-between items-center p-4">
        <Label>{table.getRowModel().rows.length} Results</Label>
      </div>
    </div>
  )
}
