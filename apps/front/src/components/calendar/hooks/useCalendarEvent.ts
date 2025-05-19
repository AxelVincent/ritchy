import { useState, useEffect } from 'react'

interface CalendarEventState {
  title: string
  date: Date | undefined
  time: string | undefined
  selectedCalendar: string | undefined
  description: string
  duration: number
}

const STORAGE_KEY = 'ritchy-calendar-event'

export const useCalendarEvent = (placeName: string, notes = '') => {
  const [state, setState] = useState<CalendarEventState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.date) {
          parsed.date = new Date(parsed.date)
        }
        return parsed
      } catch (error) {
        console.error('Error parsing calendar event state:', error)
      }
    }
    return {
      title: `Ritchy - Meeting with ${placeName}`,
      date: new Date(),
      time: '09:00',
      selectedCalendar: undefined,
      description: notes,
      duration: 30,
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const updateState = (updates: Partial<CalendarEventState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }

  const resetState = () => {
    setState({
      title: `Ritchy - Meeting with ${placeName}`,
      date: new Date(),
      time: '09:00',
      selectedCalendar: undefined,
      description: notes,
      duration: 30,
    })
  }
  return { state, updateState, resetState }
}
