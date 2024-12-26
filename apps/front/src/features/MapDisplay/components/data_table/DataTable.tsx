import { TextWrapper } from '@/components/common/TextWrapper'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataExport } from '@/features/MapDisplay/components/data_export/DataExport'
import { AddToListDialog } from '@/features/MapDisplay/components/data_table/AddToListDialog'
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
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { RemoveFromListDialog } from './RemoveFromListDialog'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowHover: React.Dispatch<React.SetStateAction<string | null>>
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
  onRowHover,
  mapBoxHoveredPlaceId,
  setDataTableRowSelection,
  dataTableRowSelection,
  listId,
}: DataTableProps<TData, TValue>) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [showListDialog, setShowListDialog] = useState(false)

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
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection: dataTableRowSelection,
    },
  })

  // Get the selected rows data
  const selectedRows = table.getSelectedRowModel().rows

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row justify-between items-center p-4">
          <Input
            placeholder="Filter name..."
            value={
              (table.getColumn('displayName')?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table.getColumn('displayName')?.setFilterValue(event.target.value)
            }
            className=""
          />
          {listId ? (
            <>
              <RemoveFromListDialog
                open={showListDialog}
                onOpenChange={setShowListDialog}
                selectedItems={selectedRows.map((row) => row.original)}
                listId={listId}
              />
              {selectedRows.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setShowListDialog(true)}
                >
                  Remove {selectedRows.length} item(s) from list
                </Button>
              )}
            </>
          ) : (
            <>
              <AddToListDialog
                open={showListDialog}
                onOpenChange={setShowListDialog}
                selectedItems={selectedRows.map((row) => row.original)}
              />
              {selectedRows.length > 0 && (
                <Button
                  variant="default"
                  onClick={() => setShowListDialog(true)}
                >
                  Add {selectedRows.length} item(s) to list
                </Button>
              )}
            </>
          )}
          <DataExport data={data} />
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
          <table className="border-separate border-spacing-0 min-w-full border-spacing-0">
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
                    mapBoxHoveredPlaceId === row.original.id && 'bg-gray-200',
                    mapBoxSelectedPlaceId === row.original.id && 'bg-gray-200',
                  )

                  return (
                    <tr
                      key={row.original.id}
                      data-state={row.getIsSelected() && 'selected'}
                      onMouseEnter={() => onRowHover(row.original.id)}
                      onMouseLeave={() => onRowHover(null)}
                      tabIndex={0}
                      className={backgroundClasses}
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
