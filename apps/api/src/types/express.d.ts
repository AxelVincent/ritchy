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

export interface AuthUser {
  userId: string
  sessionId: string
}
