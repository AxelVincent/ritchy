import { DEFAULT_EMOJIS } from '@/api/mutations/lists/useCustomListMutations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCustomLists } from '@/features/MapDisplay/hooks/useCustomLists'
import { useState } from 'react'

interface AddToListDialogProps<T> {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: T[]
}

export function AddToListDialog<T>({
  open,
  onOpenChange,
  selectedItems,
}: AddToListDialogProps<T>) {
  const [showNewListInput, setShowNewListInput] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('📍')
  const { lists, addList, addItemsToList } = useCustomLists()
  const defaultEmojis = DEFAULT_EMOJIS

  const handleAddToList = async (listId: string) => {
    await addItemsToList(listId, selectedItems)
    onOpenChange(false)
  }

  const handleCreateList = async () => {
    if (!newListName) return
    const newListId = await addList({
      name: newListName,
      emoji: selectedEmoji,
    })
    await addItemsToList(newListId, selectedItems)
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
