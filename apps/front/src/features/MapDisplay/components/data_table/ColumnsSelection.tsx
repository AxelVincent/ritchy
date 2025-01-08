import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Table } from '@tanstack/react-table'
import { ChevronDown, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'

interface ColumnsSelectionProps<TData> {
  table: Table<TData>
}

const columnVisibilitySchema = z.record(z.boolean())

const STORAGE_KEY = 'table-column-visibility'

export const ColumnsSelection = <TData,>({
  table,
}: ColumnsSelectionProps<TData>) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)

  // Load initial state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const validated = columnVisibilitySchema.parse(parsed)
        table.setColumnVisibility(validated)
      }
    } catch (error) {
      console.error('Failed to load column visibility state:', error)
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [table])

  // Save state on changes
  const handleVisibilityChange = (columnId: string, value: boolean) => {
    const newState = {
      ...table.getState().columnVisibility,
      [columnId]: value,
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
      table.setColumnVisibility(newState)
    } catch (error) {
      console.error('Failed to save column visibility state:', error)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-auto">
          Columns
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[220px]"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            className="flex h-8 w-full rounded-md bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search columns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <ScrollArea className="h-[300px]">
          {table
            .getAllColumns()
            .filter((column) => column.getCanHide())
            .filter((column) =>
              column.id.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize cursor-pointer"
                checked={column.getIsVisible()}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(value) =>
                  handleVisibilityChange(column.id, !!value)
                }
              >
                {column.id
                  .split(/(?=[A-Z])|(?:And)/)
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </DropdownMenuCheckboxItem>
            ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
