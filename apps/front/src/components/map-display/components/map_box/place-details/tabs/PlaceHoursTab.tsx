import { OpeningHoursContent } from '@/components/common/OpeningHours'
import type { Place } from '@ritchy/types'

export const PlaceHoursTab = ({ place }: { place: Place }) => {
  return (
    <div className="h-full overflow-auto">
      {place.openingHours ? (
        <div className="flex flex-col">
          <OpeningHoursContent openingHours={place.openingHours} />
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="text-sm text-muted-foreground">
            No opening hours available
          </div>
        </div>
      )}
    </div>
  )
}
