import { GoogleCalendarService } from 'apps/api/src/external/google_calendar/service'
import { googleOAuthMiddleware } from 'apps/api/src/middleware/google-oauth'
import type { Request, Response } from 'express'

export const handleGoogleCalendarEvent = async (
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
    const eventId = req.params.eventId

    if (!calendarId || !eventId) {
      res.status(400).json({ error: 'Missing calendar ID or event ID' })
      return
    }

    const googleCalendarService = new GoogleCalendarService({
      clientId,
      clientSecret,
      redirectUri,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })

    const event = await googleCalendarService.getEvent(
      userId,
      calendarId,
      eventId,
    )
    res.status(200).json(event)
    return
  } catch (error) {
    console.error(`Error handling Google calendar event: ${error}`)
    if (error instanceof Error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Error handling Google calendar event' })
    return
  }
}
