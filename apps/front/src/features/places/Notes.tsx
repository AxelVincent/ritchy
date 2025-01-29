import { useAddPlaceNote } from '@/api/mutations/notes/useAddPlaceNote'
import { usePlaceNotesQuery } from '@/api/queries/notes/usePlaceNotes'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import type { Note } from '@ritchy/types'
import { formatDistanceToNow } from 'date-fns'
import { ArrowUpCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'

const NoteEditor = ({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (content: string) => void
  isSubmitting: boolean
}) => {
  const [content, setContent] = useState('')

  const handleSubmit = () => {
    if (!content.trim()) return
    onSubmit(content)
    setContent('')
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }

  return (
    <div className="flex items-center">
      <Textarea
        placeholder="Add a note..."
        value={content}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        className="min-h-[36px] max-h-[36px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none p-2"
        disabled={isSubmitting}
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      />
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleSubmit}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          disabled={!content.trim() || isSubmitting}
        >
          <ArrowUpCircle
            className={`h-4 w-4 ${
              content.trim() && !isSubmitting ? 'text-blue-600' : ''
            }`}
          />
        </Button>
      </div>
    </div>
  )
}

export const Notes = ({
  placeId,
  onNoteAdded,
}: {
  placeId: string
  onNoteAdded?: (note: Note) => void
}) => {
  const { data, isLoading, error } = usePlaceNotesQuery(placeId)
  const addNoteMutation = useAddPlaceNote()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddNote = async (content: string) => {
    setIsSubmitting(true)
    try {
      const result = await addNoteMutation.mutateAsync({
        placeId,
        note: content,
      })
      onNoteAdded?.(result as Note)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Error loading notes: {error.message}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-[-12px]">
      {/* Fixed top section */}
      <div className="flex-none bg-background">
        <NoteEditor onSubmit={handleAddNote} isSubmitting={isSubmitting} />
      </div>
      <Separator />

      {/* Scrollable notes section */}
      <div className="flex-1 overflow-y-auto p-2">
        {!Array.isArray(data) ? (
          <div className="text-sm text-destructive">
            Error loading notes: {data?.error}
          </div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-2">
            No notes added yet for this place.
          </div>
        ) : (
          <div className="relative">
            {/* Continuous thread line */}
            <div className="absolute left-1 top-2 bottom-5 w-[1px] bg-border" />
            <div className="space-y-3">
              {data?.map((note) => (
                <div key={note.id} className="relative flex gap-3 pl-4">
                  {/* Dot with white center */}
                  <div className="absolute -left-[3px] top-1">
                    <div className="h-4 w-4 rounded-full border-[1px] border-border bg-background" />
                  </div>
                  {/* Note content */}
                  <div className="flex-1 pt-1">
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(note.createdAt), {
                        addSuffix: true,
                      })}
                    </div>
                    <div className="text-sm break-words whitespace-pre-wrap mt-0.5">
                      {note.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
