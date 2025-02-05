import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLists } from '@/features/map-display/hooks/useLists'
import { useToast } from '@/hooks/use-toast'

interface DeleteItemsFromListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: string[]
  listId: string
}

export function DeleteItemsFromListDialog({
  open,
  onOpenChange,
  selectedItems,
  listId,
}: DeleteItemsFromListDialogProps) {
  const { deleteItemsFromList } = useLists()
  const { toast } = useToast()

  const handleRemoveFromList = async () => {
    await deleteItemsFromList({ id: listId, items: selectedItems })
    toast({
      title: 'Removed from list',
      description: `${selectedItems.length} business${
        selectedItems.length === 1 ? '' : 'es'
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
            Are you sure you want to remove {selectedItems.length} business
            {selectedItems.length === 1 ? '' : 'es'} from this list?
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
