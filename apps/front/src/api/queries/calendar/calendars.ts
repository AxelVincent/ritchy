import { useQuery } from '@tanstack/react-query'
import type { GoogleCalendar } from '@ritchy/types'
import { useUser } from '@clerk/clerk-react'
import { getGoogleCalendarUrl } from '@/api/calendar/urls'

export const useGoogleCalendars = (enabled = true) => {
  const { user } = useUser()

  return useQuery({
    queryKey: ['google-calendars'],
    queryFn: async () => {
      const response = await fetch(
        getGoogleCalendarUrl(
          `/web/google/calendars?userId=${encodeURIComponent(user?.id || '')}`,
        ),
        {
          credentials: 'include',
        },
      )
      if (!response.ok) {
        throw new Error('Failed to fetch calendars')
      }
      return response.json() as Promise<GoogleCalendar[]>
    },
    enabled: enabled && !!user?.id,
  })
}
