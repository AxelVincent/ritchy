import { AddItemsToListDialog } from '@/components/lists/add-items-to-list-dialog'
import { DeleteItemsFromListDialog } from '@/components/lists/delete-items-from-list-dialog'
import { Button } from '@/components/ui/button'
import { Plus, Trash } from 'lucide-react'
import { useState } from 'react'

interface ListManagementButtonsProps {
  selectedIds?: Set<string>
  listId?: string
}

export const ListManagementButtons = ({
  selectedIds,
  listId,
}: ListManagementButtonsProps) => {
  const [showAddListDialog, setShowAddListDialog] = useState(false)
  const [showDeleteListDialog, setShowDeleteListDialog] = useState(false)

  const selectedCount = selectedIds?.size ?? 0
  const hasSelectedRows = selectedCount > 0
  const selectedIdsArray = selectedIds ? Array.from(selectedIds) : []

  if (hasSelectedRows) {
    return (
      <>
        <AddItemsToListDialog
          open={showAddListDialog}
          onOpenChange={setShowAddListDialog}
          selectedItems={selectedIdsArray.map((id) => ({
            userPlaceId: id,
          }))}
        />
        {listId && (
          <DeleteItemsFromListDialog
            open={showDeleteListDialog}
            onOpenChange={setShowDeleteListDialog}
            selectedItems={selectedIdsArray}
            listId={listId}
          />
        )}
        <div className="flex gap-2">
          <Button variant="default" onClick={() => setShowAddListDialog(true)}>
            <Plus className="w-4 h-4" />
            Add to list
          </Button>
          {listId && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteListDialog(true)}
            >
              <Trash className="w-4 h-4" />
              Remove from list
            </Button>
          )}
        </div>
      </>
    )
  }

  // Don't show "Add All" button when no selection - export handles bulk operations now
  return null
}
