import { Notes } from '@/components/notes/Notes'
import type { Place } from '@api/shared'

export const PlaceNotesTab = ({ place }: { place: Place }) => (
  <div className="h-full">
    <Notes userPlaceId={place.id} listId={place.listId} />
  </div>
)
