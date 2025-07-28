import { Notes } from '@/components/notes/Notes'
import type { Place } from '@ritchy/types'

export const PlaceNotesTab = ({ place }: { place: Place }) => (
  <div className="h-full">
    <Notes userPlaceId={place.id} listId={place.listId} />
  </div>
)
