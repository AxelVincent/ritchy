import express, {
  type Router,
  type Request,
  type Response,
  type RequestHandler,
} from 'express'
import { getGoogleAuthUrl } from './auth/url'
import { handleGoogleAuthCallback } from './auth/callback'
import { getGoogleCalendars } from './calendars'
import { handleGoogleCalendarEvents } from './calendars/[calendarId]/events'
import { handleGoogleCalendarEvent } from './calendars/[calendarId]/events/[eventId]'

const googleRouter: Router = express.Router()

// Auth routes
googleRouter.get('/auth/url', getGoogleAuthUrl)
googleRouter.get('/auth/callback', handleGoogleAuthCallback)

// Calendar routes
googleRouter.get('/calendars', getGoogleCalendars)
googleRouter.post('/calendars/:calendarId/events', handleGoogleCalendarEvents)
googleRouter.get(
  '/calendars/:calendarId/events/:eventId',
  handleGoogleCalendarEvent,
)

export default googleRouter
