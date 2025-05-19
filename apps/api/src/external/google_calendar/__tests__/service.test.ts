import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GoogleCalendarService } from '../service'
import type { GoogleCalendarEvent } from '../types'

// Mock the database connection
vi.mock('../../db/db', () => ({
  db: {
    query: {
      googleOauthTokens: {
        findFirst: vi.fn().mockImplementation(() =>
          Promise.resolve({
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: 3600,
            createTime: new Date(),
            userId: 'user-1',
            scope: 'https://www.googleapis.com/auth/calendar',
            tokenType: 'Bearer',
            idToken: 'mock-id-token',
          }),
        ),
      },
    },
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => Promise.resolve({})),
      })),
    })),
  },
}))

// Mock the postgres module to prevent real database connections
vi.mock('postgres', () => ({
  default: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue([]),
  })),
}))

// Mock the googleapis module
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        generateAuthUrl: vi.fn().mockReturnValue('https://mock-auth-url'),
        getToken: vi.fn().mockResolvedValue({
          tokens: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expiry_date: Date.now() + 3600000,
            scope: 'https://www.googleapis.com/auth/calendar',
            token_type: 'Bearer',
            id_token: 'mock-id-token',
          },
        }),
        setCredentials: vi.fn(),
        refreshAccessToken: vi.fn().mockResolvedValue({
          credentials: {
            access_token: 'new-mock-access-token',
            expiry_date: Date.now() + 3600000,
          },
        }),
      })),
    },
    calendar: vi.fn().mockReturnValue({
      calendarList: {
        list: vi.fn().mockResolvedValue({
          data: {
            items: [
              {
                id: 'primary',
                summary: 'Primary Calendar',
                description: 'My primary calendar',
                primary: true,
                accessRole: 'owner',
              },
            ],
          },
        }),
      },
      events: {
        insert: vi.fn().mockResolvedValue({
          data: {
            id: 'event-1',
            summary: 'Test Event',
            description: 'Test Description',
            start: {
              dateTime: '2024-03-20T10:00:00Z',
              timeZone: 'UTC',
            },
            end: {
              dateTime: '2024-03-20T11:00:00Z',
              timeZone: 'UTC',
            },
            location: 'Test Location',
            attendees: [
              {
                email: 'test@example.com',
                displayName: 'Test User',
              },
            ],
          },
        }),
        get: vi.fn().mockResolvedValue({
          data: {
            id: 'event-1',
            summary: 'Test Event',
            description: 'Test Description',
            start: {
              dateTime: '2024-03-20T10:00:00Z',
              timeZone: 'UTC',
            },
            end: {
              dateTime: '2024-03-20T11:00:00Z',
              timeZone: 'UTC',
            },
            location: 'Test Location',
            attendees: [
              {
                email: 'test@example.com',
                displayName: 'Test User',
              },
            ],
          },
        }),
        update: vi.fn().mockResolvedValue({
          data: {
            id: 'event-1',
            summary: 'Updated Event',
            description: 'Updated Description',
            start: {
              dateTime: '2024-03-20T10:00:00Z',
              timeZone: 'UTC',
            },
            end: {
              dateTime: '2024-03-20T11:00:00Z',
              timeZone: 'UTC',
            },
            location: 'Updated Location',
            attendees: [
              {
                email: 'test@example.com',
                displayName: 'Test User',
              },
            ],
          },
        }),
        delete: vi.fn().mockResolvedValue({}),
      },
    }),
  },
}))

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService

  beforeEach(() => {
    service = new GoogleCalendarService({
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
      redirectUri: 'mock-redirect-uri',
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })
  })

  describe('getAuthUrl', () => {
    it('should generate auth URL', () => {
      const userId = 'user-1'
      const url = service.getAuthUrl(userId)
      expect(url).toBe('https://mock-auth-url')
    })
  })

  describe('getTokens', () => {
    it('should exchange code for tokens', async () => {
      const tokens = await service.getTokens('mock-code')
      expect(tokens).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: expect.any(Number),
        scope: 'https://www.googleapis.com/auth/calendar',
        tokenType: 'Bearer',
        idToken: 'mock-id-token',
      })
    })
  })

  describe('listCalendars', () => {
    it('should list user calendars', async () => {
      const calendars = await service.listCalendars('user-1')
      expect(calendars).toEqual([
        {
          id: 'primary',
          summary: 'Primary Calendar',
          description: 'My primary calendar',
          primary: true,
          accessRole: 'owner',
        },
      ])
    })
  })

  describe('createEvent', () => {
    it('should create a calendar event', async () => {
      const event: GoogleCalendarEvent = {
        summary: 'Test Event',
        description: 'Test Description',
        start: {
          dateTime: '2024-03-20T10:00:00Z',
          timeZone: 'UTC',
        },
        end: {
          dateTime: '2024-03-20T11:00:00Z',
          timeZone: 'UTC',
        },
        location: 'Test Location',
        attendees: [
          {
            email: 'test@example.com',
            displayName: 'Test User',
          },
        ],
      }

      const createdEvent = await service.createEvent('user-1', 'primary', event)
      expect(createdEvent).toEqual({
        id: 'event-1',
        summary: 'Test Event',
        description: 'Test Description',
        start: {
          dateTime: '2024-03-20T10:00:00Z',
          timeZone: 'UTC',
        },
        end: {
          dateTime: '2024-03-20T11:00:00Z',
          timeZone: 'UTC',
        },
        location: 'Test Location',
        attendees: [
          {
            email: 'test@example.com',
            displayName: 'Test User',
          },
        ],
      })
    })
  })

  describe('getEvent', () => {
    it('should get a calendar event', async () => {
      const event = await service.getEvent('user-1', 'primary', 'event-1')
      expect(event).toEqual({
        id: 'event-1',
        summary: 'Test Event',
        description: 'Test Description',
        start: {
          dateTime: '2024-03-20T10:00:00Z',
          timeZone: 'UTC',
        },
        end: {
          dateTime: '2024-03-20T11:00:00Z',
          timeZone: 'UTC',
        },
        location: 'Test Location',
        attendees: [
          {
            email: 'test@example.com',
            displayName: 'Test User',
          },
        ],
      })
    })
  })
})
