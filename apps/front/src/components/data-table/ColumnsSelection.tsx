import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toTitleCase } from '@/lib/toTitleCase'
import type { Column, Table } from '@tanstack/react-table'
import { ChevronDown, GripVertical, Search, Settings2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'

interface ColumnsSelectionProps<TData> {
  table: Table<TData>
}

const columnVisibilitySchema = z.record(z.boolean())
const columnOrderSchema = z.array(z.string())

const VISIBILITY_STORAGE_KEY = 'table-column-visibility'
const ORDER_STORAGE_KEY = 'table-column-order'

export const ColumnsSelection = <TData,>({
  table,
}: ColumnsSelectionProps<TData>) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [draggedColumn, setDraggedColumn] = useState<Column<
    TData,
    unknown
  > | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  // Add a ref for the search input
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Load initial visibility state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(VISIBILITY_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const validated = columnVisibilitySchema.parse(parsed)
        table.setColumnVisibility(validated)
      }
    } catch (error) {
      console.error('Failed to load column visibility state:', error)
      localStorage.removeItem(VISIBILITY_STORAGE_KEY)
    }
  }, [table])

  // Load initial column order
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ORDER_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const validated = columnOrderSchema.parse(parsed)
        table.setColumnOrder(validated)
      }
    } catch (error) {
      console.error('Failed to load column order state:', error)
      localStorage.removeItem(ORDER_STORAGE_KEY)
    }
  }, [table])

  // Add a useEffect to maintain focus when the dropdown is open
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (open && searchInputRef.current) {
      // Short timeout to ensure the dropdown is fully rendered
      const timeoutId = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 10)
      return () => clearTimeout(timeoutId)
    }
  }, [open, searchQuery])

  // Save visibility state on changes
  const handleVisibilityChange = (columnId: string, value: boolean) => {
    // Don't allow hiding the selection column
    if (columnId === 'select' && !value) {
      return
    }

    // If trying to hide the last visible column, prevent it
    if (!value) {
      const currentVisibility = table.getState().columnVisibility
      const visibleColumns = Object.entries(currentVisibility)
        .filter(([_, isVisible]) => isVisible)
        .map(([id]) => id)

      if (visibleColumns.length === 1 && visibleColumns[0] === columnId) {
        // This is the last visible column, don't allow hiding it
        return
      }
    }

    const newState = {
      ...table.getState().columnVisibility,
      [columnId]: value,
    }

    try {
      localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(newState))
      table.setColumnVisibility(newState)
    } catch (error) {
      console.error('Failed to save column visibility state:', error)
    }
  }

  // Handle drag start
  const handleDragStart = (column: Column<TData, unknown>) => {
    setDraggedColumn(column)
  }

  // Update handleDragOver to show where the column will be placed
  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    columnId: string,
  ) => {
    e.preventDefault()
    if (draggedColumn && draggedColumn.id !== columnId) {
      setDropTargetId(columnId)
    }
  }

  // Clear the indicator when drag ends
  const handleDragEnd = () => {
    setDraggedColumn(null)
    setDropTargetId(null)
  }

  // Handle drop
  const handleDrop = (targetColumn: Column<TData, unknown>) => {
    if (!draggedColumn || draggedColumn.id === targetColumn.id) {
      setDraggedColumn(null)
      return
    }

    // Get current column order
    const currentOrder =
      table.getState().columnOrder.length > 0
        ? table.getState().columnOrder
        : table.getAllLeafColumns().map((column) => column.id)

    // Create new order by moving dragged column before target column
    const sourceIndex = currentOrder.indexOf(draggedColumn.id)
    const targetIndex = currentOrder.indexOf(targetColumn.id)

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const newOrder = [...currentOrder]
      newOrder.splice(sourceIndex, 1)
      newOrder.splice(targetIndex, 0, draggedColumn.id)

      // Save and apply new order
      try {
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(newOrder))
        table.setColumnOrder(newOrder)
      } catch (error) {
        console.error('Failed to save column order state:', error)
      }
    }

    setDraggedColumn(null)
  }

  // Reset column order
  const resetColumnOrder = () => {
    localStorage.removeItem(ORDER_STORAGE_KEY)
    table.resetColumnOrder()
  }

  // Get columns in current order for display
  const orderedColumns = () => {
    const allColumns = table
      .getAllColumns()
      .filter((column) => column.getCanHide())

    if (table.getState().columnOrder.length > 0) {
      // Sort by the current column order
      return [...allColumns].sort((a, b) => {
        const orderIds = table.getState().columnOrder
        const aIndex = orderIds.indexOf(a.id)
        const bIndex = orderIds.indexOf(b.id)

        // If column is not in order array, place it at the end
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1

        return aIndex - bIndex
      })
    }

    return allColumns
  }

  // Add functions to select/deselect all columns
  const showAllColumns = () => {
    const allVisible = Object.fromEntries(
      table.getAllLeafColumns().map((column) => [column.id, true]),
    )
    localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(allVisible))
    table.setColumnVisibility(allVisible)
  }

  const hideAllColumns = () => {
    // Define essential columns that should always remain visible
    const essentialColumns = ['select'] // The selection column

    const allHidden = Object.fromEntries(
      table
        .getAllLeafColumns()
        .map((column) => [column.id, essentialColumns.includes(column.id)]),
    )

    localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(allHidden))
    table.setColumnVisibility(allHidden)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-auto">
          <Settings2 className="h-4 w-4" />
          Customize Columns
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[280px]"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            className="flex h-8 w-full rounded-md bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search columns..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              // Ensure input keeps focus after state update
              e.currentTarget.focus()
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
          />
        </div>
        <div className="px-3 py-2 text-xs text-muted-foreground">
          Drag columns to reorder. Check/uncheck to show/hide.
        </div>
        <div className="flex justify-between px-3 py-1 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={showAllColumns}
            className="text-xs h-7"
          >
            Show All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={hideAllColumns}
            className="text-xs h-7"
          >
            Hide All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetColumnOrder}
            className="text-xs h-7"
          >
            Reset Order
          </Button>
        </div>
        <ScrollArea className="h-[300px]">
          {orderedColumns()
            .filter(
              (column) =>
                column.id !== 'select' && // Filter out the selection column
                column.id.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((column) => (
              <div
                key={column.id}
                draggable
                onDragStart={() => handleDragStart(column)}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragEnd={handleDragEnd}
                onDragLeave={() => setDropTargetId(null)}
                onDrop={() => handleDrop(column)}
                className={`flex items-center px-2 py-1 hover:bg-accent ${
                  draggedColumn?.id === column.id ? 'opacity-50' : ''
                } ${dropTargetId === column.id ? 'border-t-2 border-primary' : ''}`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab mr-1" />
                <DropdownMenuCheckboxItem
                  className="capitalize cursor-pointer flex-1"
                  checked={column.getIsVisible()}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(value) =>
                    handleVisibilityChange(column.id, !!value)
                  }
                >
                  {toTitleCase(column.id)}
                </DropdownMenuCheckboxItem>
              </div>
            ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
