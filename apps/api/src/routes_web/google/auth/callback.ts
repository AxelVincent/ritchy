import { GoogleCalendarService } from 'apps/api/src/external/google_calendar/service'
import { storeTokensInDatabase } from 'apps/api/src/external/google_calendar/utils'
import type { Request, Response } from 'express'

export const handleGoogleAuthCallback = async (
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

    const code = req.query.code as string
    const userId = req.query.state as string

    if (!code || !userId) {
      res.status(400).json({ error: 'Missing code or user ID' })
      return
    }

    const googleCalendarService = new GoogleCalendarService({
      clientId,
      clientSecret,
      redirectUri,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })

    const tokens = await googleCalendarService.getTokens(code)
    await storeTokensInDatabase(userId, tokens)
    res.redirect('/dashboard')
    return
  } catch (error) {
    console.error(`Error handling Google auth callback: ${error}`)
    if (error instanceof Error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Error handling Google auth callback' })
    return
  }
}
