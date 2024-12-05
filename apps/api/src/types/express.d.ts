import 'express'

declare module 'express' {
  interface Response {
    responseTime: number
  }
}

declare global {
  namespace Express {
    interface Response {
      responseTime: number
    }
  }
}
