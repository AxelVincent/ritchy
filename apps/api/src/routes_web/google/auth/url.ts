import { GoogleCalendarService } from 'apps/api/src/external/google_calendar/service'
import type { Request, Response } from 'express'

export const getGoogleAuthUrl = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      res
        .status(500)
        .json({ error: 'Missing required Google OAuth configuration' })
      return
    }

    const userId = req.query.userId as string

    if (!userId) {
      res.status(400).json({ error: 'Missing user ID' })
      return
    }

    const googleCalendarService = new GoogleCalendarService({
      clientId,
      clientSecret,
      redirectUri,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })

    const authUrl = await googleCalendarService.getAuthUrl(userId)
    res.status(200).json({ url: authUrl })
    return
  } catch (error) {
    console.error(`Error generating Google auth URL: ${error}`)
    if (error instanceof Error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Error generating Google auth URL' })
    return
  }
}
