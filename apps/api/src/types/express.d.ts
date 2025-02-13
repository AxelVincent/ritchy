declare global {
  namespace Express {
    interface Request {
      auth: {
        userId: string
        sessionId: string
      }
      rawBody: Buffer
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
