import { GoogleCalendarService } from 'apps/api/src/external/google_calendar/service'
import { googleOAuthMiddleware } from 'apps/api/src/middleware/google-oauth'
import type { Request, Response } from 'express'

export const getGoogleCalendars = async (
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

    const googleCalendarService = new GoogleCalendarService({
      clientId,
      clientSecret,
      redirectUri,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })

    const calendars = await googleCalendarService.listCalendars(userId)
    res.status(200).json(calendars)
    return
  } catch (error) {
    console.error(`Error fetching Google calendars: ${error}`)
    if (error instanceof Error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Error fetching Google calendars' })
    return
  }
}
