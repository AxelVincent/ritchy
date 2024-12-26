import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCustomLists } from '@/features/MapDisplay/hooks/useCustomLists'
import { useToast } from '@/hooks/use-toast'

interface RemoveFromListDialogProps<T> {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: T[]
  listId: string
}

export function RemoveFromListDialog<T>({
  open,
  onOpenChange,
  selectedItems,
  listId,
}: RemoveFromListDialogProps<T>) {
  const { removeItemsFromList } = useCustomLists()
  const { toast } = useToast()

  const handleRemoveFromList = async () => {
    await removeItemsFromList(listId, selectedItems)
    toast({
      title: 'Removed from list',
      description: `${selectedItems.length} item${
        selectedItems.length === 1 ? '' : 's'
      } removed from the list`,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove from List</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove {selectedItems.length} item
            {selectedItems.length === 1 ? '' : 's'} from this list?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRemoveFromList}>
            Remove
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
