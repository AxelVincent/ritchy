import 'dotenv/config'
import { clerkMiddleware, getAuth } from '@clerk/express'
import cors from 'cors'
import express, { type NextFunction } from 'express'
import webRoutes from './routes_web'

const app = express()

app.use(clerkMiddleware())

app.use(
  cors({
    origin: process.env.FRONTEND_BASE_URL,
    credentials: true
  })
)

// Protect a route based on authorization status
const isAuthenticated = (
  req: express.Request,
  res: express.Response,
  next: NextFunction
): void => {
  console.log('isAuthenticated middleware called', {
    url: req.url,
    method: req.method,
    body: req.body
  })

  try {
    const { userId, sessionId } = getAuth(req)

    if (!userId || !sessionId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
      return
    }

    req.auth = { userId, sessionId }
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process authentication'
    })
    return
  }
}

app.use(express.json())

// Healthcheck route
app.get('/health', (_, res) => {
  console.log('Healthcheck route called')
  res.status(200).json({ status: 'ok' })
})

app.use('/web', isAuthenticated, webRoutes)

const PORT = Number.parseInt(process.env.PORT || '3030', 10)
app.listen(PORT, '::', () => {
  console.log(`Server running on port ${PORT} (IPv4/IPv6)`)
})
