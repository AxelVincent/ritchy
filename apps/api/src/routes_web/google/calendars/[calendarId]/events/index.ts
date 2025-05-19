import { GoogleCalendarService } from 'apps/api/src/external/google_calendar/service'
import { googleOAuthMiddleware } from 'apps/api/src/middleware/google-oauth'
import { googleCalendarEventSchema } from 'apps/api/src/external/google_calendar/types'
import { ZodError } from 'zod'
import type { Request, Response } from 'express'

export const handleGoogleCalendarEvents = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authenticatedReq = await googleOAuthMiddleware(req)
    const { userId } = authenticatedReq

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      res
        .status(500)
        .json({ error: 'Missing required Google OAuth configuration' })
      return
    }

    const calendarId = req.params.calendarId

    if (!calendarId) {
      res.status(400).json({ error: 'Missing calendar ID' })
      return
    }

    const googleCalendarService = new GoogleCalendarService({
      clientId,
      clientSecret,
      redirectUri,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })

    switch (req.method) {
      case 'GET': {
        const timeMin =
          (req.query.timeMin as string) || new Date().toISOString()
        const timeMax = req.query.timeMax as string
        const maxResults = Number.parseInt(
          (req.query.maxResults as string) || '10',
          10,
        )
        const singleEvents = req.query.singleEvents === 'true'
        const orderBy = ((req.query.orderBy as string) || 'startTime') as
          | 'startTime'
          | 'updated'
        const q = req.query.q as string
        const updatedMin = req.query.updatedMin as string

        const events = await googleCalendarService.listEvents(
          userId,
          calendarId,
          {
            timeMin,
            timeMax,
            maxResults,
            singleEvents,
            orderBy,
            q,
            updatedMin,
          },
        )
        res.status(200).json(events)
        return
      }
      case 'POST': {
        try {
          const validatedEvent = googleCalendarEventSchema.parse(req.body)
          const newEvent = await googleCalendarService.createEvent(
            userId,
            calendarId,
            validatedEvent,
          )
          res.status(201).json(newEvent)
          return
        } catch (error) {
          if (error instanceof ZodError) {
            res.status(400).json({ errors: error.errors })
            return
          }
          throw error
        }
      }
      default:
        res.status(405).json({ error: 'Method not allowed' })
        return
    }
  } catch (error) {
    console.error(`Error handling Google calendar events: ${error}`)
    if (error instanceof Error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Error handling Google calendar events' })
    return
  }
}
