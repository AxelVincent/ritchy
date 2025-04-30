import { Notes } from '@/components/notes/Notes'
import type { Place } from '@ritchy/types'

export const PlaceNotesTab = ({ place }: { place: Place }) => (
  <div className="h-full">
    <Notes placeId={place.id} searchId={place.searchId} listId={place.listId} />
  </div>
)
