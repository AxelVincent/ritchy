import { z } from 'zod'

export const googleCalendarSchema = z.object({
  id: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  primary: z.boolean().optional(),
  accessRole: z.string().optional(),
})

export type GoogleCalendar = z.infer<typeof googleCalendarSchema>
