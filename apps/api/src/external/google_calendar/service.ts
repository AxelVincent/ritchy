import { google } from 'googleapis'
import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { googleOauthTokens } from '../../db/schema'
import type {
  GoogleCalendarEvent,
  GoogleCalendar,
  GoogleCalendarServiceConfig,
  GoogleCalendarTokens,
} from './types'

export class GoogleCalendarService {
  private readonly oauth2Client
  private readonly calendar

  constructor(config: GoogleCalendarServiceConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri,
    )

    this.calendar = google.calendar({
      version: 'v3',
      auth: this.oauth2Client,
    })
  }

  /**
   * Generate the OAuth2 authorization URL
   */
  getAuthUrl(userId: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      state: userId,
    })
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string): Promise<GoogleCalendarTokens> {
    const { tokens } = await this.oauth2Client.getToken(code)

    if (
      !tokens.access_token ||
      !tokens.refresh_token ||
      !tokens.expiry_date ||
      !tokens.scope ||
      !tokens.token_type ||
      !tokens.id_token
    ) {
      throw new Error('Invalid token response from Google')
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expiry_date - Date.now(),
      scope: tokens.scope,
      tokenType: tokens.token_type,
      idToken: tokens.id_token,
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(userId: string): Promise<string> {
    const tokens = await db.query.googleOauthTokens.findFirst({
      where: eq(googleOauthTokens.userId, userId),
    })

    if (!tokens) {
      throw new Error('No tokens found for user')
    }

    this.oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken,
    })

    const { credentials } = await this.oauth2Client.refreshAccessToken()

    if (!credentials.access_token || !credentials.expiry_date) {
      throw new Error('Invalid token refresh response from Google')
    }

    const newAccessToken = credentials.access_token

    // Update the access token in the database
    await db
      .update(googleOauthTokens)
      .set({
        accessToken: newAccessToken,
        expiresIn: credentials.expiry_date - Date.now(),
      })
      .where(eq(googleOauthTokens.userId, userId))

    return newAccessToken
  }

  /**
   * List user's calendars
   */
  async listCalendars(userId: string): Promise<GoogleCalendar[]> {
    const accessToken = await this.getValidAccessToken(userId)
    this.oauth2Client.setCredentials({ access_token: accessToken })

    const response = await this.calendar.calendarList.list()
    return (response.data.items || []).map((calendar) => {
      if (!calendar.id || !calendar.summary || !calendar.accessRole) {
        throw new Error('Invalid calendar response from Google')
      }
      return {
        id: calendar.id,
        summary: calendar.summary,
        description: calendar.description || undefined,
        primary: calendar.primary || undefined,
        accessRole: calendar.accessRole,
      }
    })
  }

  /**
   * Create a calendar event
   */
  async createEvent(
    userId: string,
    calendarId: string,
    event: GoogleCalendarEvent,
  ): Promise<GoogleCalendarEvent> {
    const accessToken = await this.getValidAccessToken(userId)
    this.oauth2Client.setCredentials({ access_token: accessToken })

    const response = await this.calendar.events.insert({
      calendarId,
      requestBody: event,
    })

    if (
      !response.data.start?.dateTime ||
      !response.data.start?.timeZone ||
      !response.data.end?.dateTime ||
      !response.data.end?.timeZone ||
      !response.data.summary
    ) {
      throw new Error('Invalid event response from Google Calendar')
    }

    return {
      id: response.data.id || undefined,
      summary: response.data.summary,
      description: response.data.description || undefined,
      start: {
        dateTime: response.data.start.dateTime,
        timeZone: response.data.start.timeZone,
      },
      end: {
        dateTime: response.data.end.dateTime,
        timeZone: response.data.end.timeZone,
      },
      location: response.data.location || undefined,
      attendees: response.data.attendees?.map((attendee) => {
        if (!attendee.email) {
          throw new Error('Invalid attendee response from Google Calendar')
        }
        return {
          email: attendee.email,
          displayName: attendee.displayName || undefined,
        }
      }),
    }
  }

  /**
   * Get a calendar event
   */
  async getEvent(
    userId: string,
    calendarId: string,
    eventId: string,
  ): Promise<GoogleCalendarEvent> {
    const accessToken = await this.getValidAccessToken(userId)
    this.oauth2Client.setCredentials({ access_token: accessToken })

    const response = await this.calendar.events.get({
      calendarId,
      eventId,
    })

    if (
      !response.data.start?.dateTime ||
      !response.data.start?.timeZone ||
      !response.data.end?.dateTime ||
      !response.data.end?.timeZone ||
      !response.data.summary
    ) {
      throw new Error('Invalid event response from Google Calendar')
    }

    return {
      id: response.data.id || undefined,
      summary: response.data.summary,
      description: response.data.description || undefined,
      start: {
        dateTime: response.data.start.dateTime,
        timeZone: response.data.start.timeZone,
      },
      end: {
        dateTime: response.data.end.dateTime,
        timeZone: response.data.end.timeZone,
      },
      location: response.data.location || undefined,
      attendees: response.data.attendees?.map((attendee) => {
        if (!attendee.email) {
          throw new Error('Invalid attendee response from Google Calendar')
        }
        return {
          email: attendee.email,
          displayName: attendee.displayName || undefined,
        }
      }),
    }
  }
  /**
   * Get a valid access token, refreshing if necessary
   */
  private async getValidAccessToken(userId: string): Promise<string> {
    const tokens = await db.query.googleOauthTokens.findFirst({
      where: eq(googleOauthTokens.userId, userId),
    })

    if (!tokens) {
      throw new Error('No tokens found for user')
    }

    // Check if token is expired (with 5-minute buffer)
    const isExpired =
      Date.now() + 5 * 60 * 1000 >
      tokens.createTime.getTime() + tokens.expiresIn * 1000

    if (isExpired) {
      return this.refreshAccessToken(userId)
    }

    return tokens.accessToken
  }
}
