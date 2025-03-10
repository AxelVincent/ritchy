import { CreateListForm } from '@/components/lists/create-list-form'
import { useLists } from '@/components/map-display/hooks/useLists'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'

interface AddItemsToListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: string[]
}

export function AddItemsToListDialog({
  open,
  onOpenChange,
  selectedItems,
}: AddItemsToListDialogProps) {
  const [showNewListInput, setShowNewListInput] = useState(false)
  const { lists, addItemsToList } = useLists()
  const { toast } = useToast()

  const handleAddToList = async (listId: string) => {
    const res = await addItemsToList({
      id: listId,
      items: selectedItems,
    })

    if ('error' in res) {
      toast({
        title: 'Error',
        description: res.error,
        variant: 'destructive',
      })
      return
    }

    const newCount = res.added.length ?? 0
    const existingCount = res.duplicates.length ?? 0

    const newItemsText =
      newCount > 0
        ? `Added ${newCount} new place${newCount === 1 ? '' : 's'}`
        : ''
    const existingItemsText =
      existingCount > 0
        ? `${existingCount} place${existingCount === 1 ? ' was' : 's were'} already in your list`
        : ''

    toast({
      title: 'Updated list',
      description: [newItemsText, existingItemsText].filter(Boolean).join('. '),
    })
    onOpenChange(false)
  }

  const handleCreateListSuccess = async (newListId: string) => {
    await handleAddToList(newListId)
    setShowNewListInput(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add {selectedItems.length} lead
            {selectedItems.length === 1 ? '' : 's'} to a list
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[300px]">
          {lists.map((list) => (
            <Button
              key={list.id}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleAddToList(list.id)}
            >
              <span className="mr-2">{list.emoji}</span>
              {list.name}
            </Button>
          ))}
        </ScrollArea>

        {showNewListInput ? (
          <CreateListForm onSuccess={handleCreateListSuccess} />
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowNewListInput(true)}
          >
            Create new list
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
