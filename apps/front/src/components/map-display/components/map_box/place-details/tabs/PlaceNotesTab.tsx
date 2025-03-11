import { Notes } from '@/components/notes/Notes'
import type { Place } from '@ritchy/types'

export const PlaceNotesTab = ({ place }: { place: Place }) => (
  <div className="h-full">
    <Notes
      placeId={place.id}
      onNoteAdded={(note) => {
        // Update the place's notes array directly
        place.notes = [note, ...(place.notes || [])]
      }}
    />
  </div>
)
