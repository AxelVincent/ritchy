import 'express-session'

declare global {
  namespace Express {
    interface Request {
      auth: {
        userId: string
        sessionId: string
        email: string
        firstName: string
        lastName: string
      }
      rawBody: Buffer
      metadata: {
        ipAddress: string
        userAgent: string | undefined
        requestId: string
        timestamp: Date
      }
    }
    interface Response {
      responseTime: number
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    hubspotOAuthState?: {
      state: string
      userId: string
      expiresAt: number
    }
  }
}

export interface AuthUser {
  userId: string
  sessionId: string
}
