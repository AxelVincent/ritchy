declare global {
  namespace Express {
    interface Request {
      auth: {
        userId: string
        sessionId: string
      }
    }
  }
}

export interface AuthUser {
  userId: string
  sessionId: string
}
