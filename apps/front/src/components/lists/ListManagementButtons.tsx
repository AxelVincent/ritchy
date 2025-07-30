import { AddItemsToListDialog } from '@/components/lists/add-items-to-list-dialog'
import { DeleteItemsFromListDialog } from '@/components/lists/delete-items-from-list-dialog'
import { Button } from '@/components/ui/button'
import type { SearchResult } from '@ritchy/types'
import type { Table } from '@tanstack/react-table'
import { Plus, Trash } from 'lucide-react'
import { useState } from 'react'

interface ListManagementButtonsProps<TData extends SearchResult> {
  table: Table<TData>
  listId?: string
}

export const ListManagementButtons = <TData extends SearchResult>({
  table,
  listId,
}: ListManagementButtonsProps<TData>) => {
  const [showAddListDialog, setShowAddListDialog] = useState(false)
  const [showDeleteListDialog, setShowDeleteListDialog] = useState(false)

  const selectedRows = table.getSelectedRowModel().rows
  const hasSelectedRows = selectedRows.length > 0
  const filteredRows = table.getFilteredRowModel().rows

  if (hasSelectedRows) {
    return (
      <>
        <AddItemsToListDialog
          open={showAddListDialog}
          onOpenChange={setShowAddListDialog}
          selectedItems={selectedRows.map((row) => ({
            userPlaceId: row.original.id,
          }))}
        />
        {listId && (
          <DeleteItemsFromListDialog
            open={showDeleteListDialog}
            onOpenChange={setShowDeleteListDialog}
            selectedItems={selectedRows.map((row) => row.original.id)}
            listId={listId}
          />
        )}
        <div className="flex gap-2">
          <Button variant="default" onClick={() => setShowAddListDialog(true)}>
            <Plus className="w-4 h-4" />
            Add {selectedRows.length} lead
            {selectedRows.length === 1 ? '' : 's'} to a list
          </Button>
          {listId && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteListDialog(true)}
            >
              <Trash className="w-4 h-4" />
              Remove {selectedRows.length} lead
              {selectedRows.length === 1 ? '' : 's'}
            </Button>
          )}
        </div>
      </>
    )
  }

  // Show "Add All" when no rows are selected
  return (
    <>
      <AddItemsToListDialog
        open={showAddListDialog}
        onOpenChange={setShowAddListDialog}
        selectedItems={filteredRows.map((row) => ({
          userPlaceId: row.original.id,
        }))}
      />
      <Button variant="default" onClick={() => setShowAddListDialog(true)}>
        <Plus className="w-4 h-4" />
        Add {filteredRows.length} lead
        {filteredRows.length === 1 ? '' : 's'} to a list
      </Button>
    </>
  )
}
