import { cn } from '@/lib/utils'
import { useMemo } from 'react'

import type { OpeningHours } from '@ritchy/types'

interface OpeningHoursProps {
  regularOpeningHours: OpeningHours
}

export const OpeningHoursContent = ({
  regularOpeningHours,
}: OpeningHoursProps) => {
  const today = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    [],
  )
  return (
    <div className="">
      {regularOpeningHours.weekdayDescriptions?.map((description) => {
        const [day, timeRange = 'Closed'] = description.split(': ') as [
          string,
          string?,
        ]
        const isToday = day === today

        return (
          <div
            key={description}
            className={cn(
              'flex justify-between items-center py-2 px-3 rounded-md',
              isToday && 'bg-muted',
            )}
          >
            <span className="font-medium">{day}</span>
            <span className="text-muted-foreground">{timeRange}</span>
          </div>
        )
      })}
    </div>
  )
}
