'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { CalendarIcon, Clock, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { posthog } from 'posthog-js'
import { useGoogleCalendars } from '@/api/queries/calendar/calendars'
import { useCreateCalendarEvent } from '@/api/mutations/calendar/events'
import { useCalendarEvent } from '@/components/calendar/hooks/useCalendarEvent'
import { getGoogleCalendarUrl } from '@/api/calendar/urls'

// Generate time options in 30-minute intervals with AM/PM format
const generateTimeOptions = () => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      const isPM = hour >= 12
      const displayHour = hour % 12 || 12
      const formattedHour = displayHour.toString()
      const formattedMinute = minute.toString().padStart(2, '0')
      const period = isPM ? 'PM' : 'AM'
      const display = `${formattedHour}:${formattedMinute} ${period}`
      const value = `${hour.toString().padStart(2, '0')}:${formattedMinute}`
      options.push({ display, value })
    }
  }
  return options
}

// Duration options
const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
]

interface CalendarConnectProps {
  placeName: string
  notes?: string
  userId: string
}

export function CalendarConnect({
  placeName,
  notes = '',
  userId,
}: CalendarConnectProps) {
  const [open, setOpen] = React.useState(false)
  const { state, updateState, resetState } = useCalendarEvent(placeName, notes)
  const { title, date, time, selectedCalendar, description, duration } = state

  const timeOptions = generateTimeOptions()
  const displayTime =
    timeOptions.find((t) => t.value === time)?.display || '9:00 AM'

  // Fetch user's calendars
  const {
    data: calendars,
    isLoading: isLoadingCalendars,
    error: calendarsError,
  } = useGoogleCalendars(open)

  // Create calendar event mutation
  const createEvent = useCreateCalendarEvent()

  // Combine date and time for the final datetime
  const getDateTime = () => {
    if (!date || !time) return null

    const [hours, minutes] = time.split(':').map(Number)
    const newDate = new Date(date)
    newDate.setHours(hours)
    newDate.setMinutes(minutes)
    return newDate
  }

  const handleConnect = async () => {
    if (!date || !selectedCalendar) return

    const startDateTime = getDateTime()
    if (!startDateTime) return

    const endDateTime = new Date(startDateTime)
    endDateTime.setMinutes(endDateTime.getMinutes() + duration)

    try {
      // Track event creation attempt
      posthog.capture('calendar_event_creation_started', {
        placeName,
        duration,
        calendarId: selectedCalendar,
      })

      await createEvent.mutateAsync({
        calendarId: selectedCalendar,
        summary: title,
        description,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      })

      // Track successful event creation
      posthog.capture('calendar_event_created', {
        placeName,
        duration,
        calendarId: selectedCalendar,
      })

      setOpen(false)
      resetState() // Reset form after successful creation
    } catch (error) {
      console.error('Failed to create event:', error)
      // Track failed event creation
      posthog.capture('calendar_event_creation_failed', {
        placeName,
        duration,
        calendarId: selectedCalendar,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleConnectGoogle = async () => {
    try {
      console.log('Fetching Google auth URL...')
      const response = await fetch(
        getGoogleCalendarUrl(
          `/web/google/auth/url?userId=${encodeURIComponent(userId)}`,
        ),
        {
          credentials: 'include',
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to get auth URL:', errorText)
        throw new Error(`Failed to get auth URL: ${errorText}`)
      }
      const authUrl = await response.text()
      console.log('Got auth URL:', authUrl)
      if (!authUrl) {
        throw new Error('No auth URL received')
      }
      window.location.href = authUrl
    } catch (error) {
      console.error('Failed to connect to Google Calendar:', error)
      // Show error to user
      alert('Failed to connect to Google Calendar. Please try again.')
    }
  }

  const handleInteraction = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
  }

  return (
    <div onClick={handleInteraction} onKeyDown={handleInteraction}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 hover:bg-muted/50"
            onClick={handleInteraction}
            onKeyDown={handleInteraction}
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            Add to Calendar
          </Button>
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-[425px] max-h-[90vh] flex flex-col"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>
              Add {placeName} to your google calendar
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-4 py-4 px-1">
              {calendarsError ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Please connect your Google Calendar to continue
                  </p>
                  <Button onClick={handleConnectGoogle}>
                    Connect Google Calendar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="title">Meeting Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter meeting title"
                      value={title}
                      onChange={(e) => updateState({ title: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="calendar">Calendar</Label>
                    <Select
                      value={selectedCalendar}
                      onValueChange={(value) =>
                        updateState({ selectedCalendar: value })
                      }
                    >
                      <SelectTrigger
                        id="calendar"
                        className="w-full"
                        onClick={handleInteraction}
                      >
                        <SelectValue placeholder="Select calendar">
                          <div className="flex items-center">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {isLoadingCalendars ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              calendars?.find(
                                (cal) => cal.id === selectedCalendar,
                              )?.summary || 'Select calendar'
                            )}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent onClick={handleInteraction}>
                        {calendars?.map((calendar) => (
                          <SelectItem
                            key={calendar.id}
                            value={calendar.id}
                            onClick={handleInteraction}
                          >
                            {calendar.summary}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Date and Time</Label>
                    <div className="border rounded-md">
                      <div className="p-2">
                        <CalendarPicker
                          mode="single"
                          selected={date}
                          onSelect={(newDate) => updateState({ date: newDate })}
                          className="mx-auto"
                        />
                      </div>
                      <div className="px-4 pb-4 pt-2 border-t">
                        <div className="text-sm font-medium mb-2">Time</div>
                        <Select
                          value={time}
                          onValueChange={(value) =>
                            updateState({ time: value })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select time">
                              <div className="flex items-center">
                                <Clock className="mr-2 h-4 w-4" />
                                {displayTime}
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((timeOption) => (
                              <SelectItem
                                key={timeOption.value}
                                value={timeOption.value}
                              >
                                {timeOption.display}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Select
                      value={duration.toString()}
                      onValueChange={(value) =>
                        updateState({ duration: Number(value) })
                      }
                    >
                      <SelectTrigger id="duration" className="w-full">
                        <SelectValue placeholder="Select duration">
                          {
                            DURATION_OPTIONS.find(
                              (opt) => opt.value === duration,
                            )?.label
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value.toString()}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Notes</Label>
                    <Textarea
                      id="description"
                      placeholder="Meeting description"
                      value={description}
                      onChange={(e) =>
                        updateState({ description: e.target.value })
                      }
                      className="min-h-[80px]"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          {!calendarsError && (
            <DialogFooter className="flex justify-end gap-2 pt-4 border-t mt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  resetState()
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={handleConnect}
                disabled={createEvent.isPending || !selectedCalendar || !date}
              >
                {createEvent.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Event'
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
