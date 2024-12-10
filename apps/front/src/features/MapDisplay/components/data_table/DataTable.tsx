import { TextWrapper } from '@/components/common/TextWrapper'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
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
import { DataExport } from '../data_export/DataExport'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowHover: (id: string | null) => void
  selectedPlaceId: string | null
  mapBoxHoveredPlaceId: string | null
  defaultRowSelection?: RowSelectionState
}

export const DataTable = <TData extends SearchResult, TValue>({
  columns,
  data,
  selectedPlaceId,
  onRowHover,
  mapBoxHoveredPlaceId,
  defaultRowSelection = {},
}: DataTableProps<TData, TValue>) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState(defaultRowSelection)

  console.log(selectedPlaceId, 'selectedPlaceId')
  console.log(mapBoxHoveredPlaceId, 'mapBoxHoveredPlaceId')

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <>
      <div className="flex flex-col h-full p-4 space-y-2">
        <div className="">
          <div className="flex flex-row">
            <Input
              placeholder="Filter name..."
              value={
                (table.getColumn('displayName')?.getFilterValue() as string) ??
                ''
              }
              onChange={(event) =>
                table
                  .getColumn('displayName')
                  ?.setFilterValue(event.target.value)
              }
              className="max-w-sm flex-shrink"
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
        <div className="overflow-y-auto h-[70%] border rounded-md">
          <div className="relative h-full overflow-auto ">
            <table className="border-separate border-spacing-0">
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
                            'px-4 py-1 border-b border-s-0 sticky top-0 z-10 bg-background text-secondary-foreground font-medium',
                            idx === 0 &&
                              'sticky border-r border-s-0  left-0 z-20 bg-background text-secondary-foreground font-medium',
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
              <tbody className="overflow-auto">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const backgroundClasses = cn(
                      'bg-background',
                      mapBoxHoveredPlaceId === row.original.id && 'bg-gray-200',
                      selectedPlaceId === row.original.id && 'bg-gray-200',
                    )

                    return (
                      <tr
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        onClick={() => row.toggleSelected()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            row.toggleSelected()
                          }
                        }}
                        onMouseEnter={() => onRowHover(row.original.id)}
                        onMouseLeave={() => onRowHover(null)}
                        tabIndex={0}
                        className={backgroundClasses}
                      >
                        {row.getVisibleCells().map((cell, idx) => (
                          <td
                            key={cell.id}
                            className={cn(
                              'px-4 py-1 border-b border-s-0 whitespace-nowrap text-secondary-foreground font-medium',
                              idx === 0 &&
                                cn(
                                  'sticky border-r border-s-0 left-0 z-10 text-secondary-foreground font-medium',
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
        <div className="flex justify-between items-center">
          <span>{table.getRowModel().rows.length} Results</span>
          <DataExport data={data} />
        </div>
      </div>
    </>
  )
}
