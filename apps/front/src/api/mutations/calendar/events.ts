import { useMutation } from '@tanstack/react-query'
import type { GoogleCalendar } from '@ritchy/types'
import { useUser } from '@clerk/clerk-react'
import { getGoogleCalendarUrl } from '@/api/calendar/urls'

interface CreateEventParams {
  calendarId: string
  summary: string
  description: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
}

export const useCreateCalendarEvent = () => {
  const { user } = useUser()

  return useMutation({
    mutationFn: async (eventData: CreateEventParams) => {
      const response = await fetch(
        getGoogleCalendarUrl(
          `/web/google/calendars/${eventData.calendarId}/events?userId=${encodeURIComponent(user?.id || '')}`,
        ),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(eventData),
        },
      )
      if (!response.ok) {
        throw new Error('Failed to create event')
      }
      return response.json()
    },
  })
}
