import { useDeletePlaceNote } from '@/api/mutations/places/notes/useDeletePlaceNote'
import { useUpdatePlaceNote } from '@/api/mutations/places/notes/useUpdatePlaceNote'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { Note } from '@api/shared'
import { formatDistanceToNow } from 'date-fns'
import { Check, Loader2, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface NoteItemProps {
  note: Note
  userPlaceId: string
}

export const NoteItem = ({ note, userPlaceId }: NoteItemProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(note.note)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { mutateAsync: updateNote, isPending: isUpdating } =
    useUpdatePlaceNote()
  const { mutateAsync: deleteNote, isPending: isDeleting } =
    useDeletePlaceNote()

  const isEdited =
    new Date(note.createdAt).getTime() !== new Date(note.updatedAt).getTime()

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Set cursor to end of text
      textareaRef.current.setSelectionRange(
        editContent.length,
        editContent.length,
      )
      // Auto-resize
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [isEditing, editContent.length])

  const handleStartEdit = () => {
    setEditContent(note.note)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditContent(note.note)
    setIsEditing(false)
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === note.note) {
      handleCancelEdit()
      return
    }

    try {
      await updateNote({
        userPlaceId,
        noteId: note.id,
        note: editContent.trim(),
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update note:', error)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteNote({
        userPlaceId,
        noteId: note.id,
      })
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      if (editContent.trim()) {
        e.preventDefault()
        handleSaveEdit()
      } else {
        e.preventDefault()
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  return (
    <>
      <div className="relative flex gap-3 pl-4 group">
        {/* Dot with white center */}
        <div className="absolute -left-[3px] top-1">
          <div className="h-4 w-4 rounded-full border-[1px] border-border bg-background" />
        </div>

        {/* Note content */}
        <div className="flex-1 pt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(note.createdAt), {
                addSuffix: true,
              })}
            </span>
            {isEdited && !isEditing && (
              <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                edited
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-1 space-y-2">
              <Textarea
                ref={textareaRef}
                value={editContent}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="min-h-[36px] max-h-[200px] resize-none text-sm"
                disabled={isUpdating}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || isUpdating}
                  className="h-7 px-2"
                >
                  {isUpdating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  className="h-7 px-2"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isUpdating || isDeleting}
                  className="h-7 px-2 ml-auto text-muted-foreground hover:text-destructive"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="text-sm break-words whitespace-pre-wrap mt-0.5 cursor-pointer rounded px-1 -mx-1 py-0.5 -my-0.5 hover:bg-muted/50 transition-colors text-left w-full"
              onClick={handleStartEdit}
            >
              {note.note}
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete note?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              note.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
