import { DEFAULT_EMOJIS } from '@/api/mutations/lists/useCreateList'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLists } from '@/features/MapDisplay/hooks/useLists'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'

interface AddToListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: string[]
}

export function AddToListDialog({
  open,
  onOpenChange,
  selectedItems,
}: AddToListDialogProps) {
  const [showNewListInput, setShowNewListInput] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('📍')
  const { lists, addList, addItemsToList } = useLists()
  const defaultEmojis = DEFAULT_EMOJIS
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

  const handleCreateList = async () => {
    if (!newListName) return
    const newListId = await addList({
      name: newListName,
      emoji: selectedEmoji,
    })
    await addItemsToList({
      id: newListId,
      items: selectedItems,
    })
    toast({
      title: 'List created',
      description: `Created "${newListName}" and added ${selectedItems.length} item${selectedItems.length === 1 ? '' : 's'}`,
    })
    setNewListName('')
    setSelectedEmoji('📍')
    setShowNewListInput(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to List</DialogTitle>
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
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative">
                <Button
                  variant="outline"
                  className="w-12"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  {selectedEmoji}
                </Button>
                {showEmojiPicker && (
                  <div className="fixed mt-1 p-2 bg-background border rounded-md shadow-lg grid grid-cols-6 gap-1 z-[100]">
                    {defaultEmojis.map((emoji) => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        className="w-8 h-8 p-0"
                        onClick={() => {
                          setSelectedEmoji(emoji)
                          setShowEmojiPicker(false)
                        }}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Enter list name"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreateList()
                  }
                }}
              />
              <Button onClick={handleCreateList}>Create</Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowNewListInput(true)}
          >
            Create New List
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
