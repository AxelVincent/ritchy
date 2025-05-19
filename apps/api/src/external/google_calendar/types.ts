import { z } from 'zod'

const DURATION_MINUTES = [15, 30] as const
type DurationMinutes = (typeof DURATION_MINUTES)[number]

export const googleCalendarEventSchema = z.object({
  id: z.string().optional(),
  summary: z.string(),
  description: z.string().optional(),
  start: z.object({
    dateTime: z.string(),
    timeZone: z.string(),
  }),
  end: z
    .object({
      dateTime: z.string(),
      timeZone: z.string(),
    })
    .refine((end) => {
      const start = new Date(end.dateTime)
      const endDate = new Date(end.dateTime)
      const diffMinutes = (endDate.getTime() - start.getTime()) / (1000 * 60)
      return DURATION_MINUTES.includes(diffMinutes as DurationMinutes)
    }, 'Event duration must be either 15 or 30 minutes'),
  location: z.string().optional(),
  attendees: z
    .array(
      z.object({
        email: z.string().email(),
        displayName: z.string().optional(),
      }),
    )
    .optional(),
})

export type GoogleCalendarEvent = z.infer<typeof googleCalendarEventSchema>

export const googleCalendarSchema = z.object({
  id: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  primary: z.boolean().optional(),
  accessRole: z.string(),
})

export type GoogleCalendar = z.infer<typeof googleCalendarSchema>

export interface GoogleCalendarServiceConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

export interface GoogleCalendarTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  scope: string
  tokenType: string
  idToken: string
}
