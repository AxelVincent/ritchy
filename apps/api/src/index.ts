import 'dotenv/config'
import { clerkMiddleware, getAuth } from '@clerk/express'
import { baseLogger, logger } from '@ritchy/logger'
import cors from 'cors'
import express, { type NextFunction } from 'express'
import pinoHttp from 'pino-http'
import webRoutes from './routes_web'

const app = express()

// Body parser middleware
app.use(express.json())

// Clerk middleware
app.use(clerkMiddleware())

// Authentication middleware
const isAuthenticated = (
  req: express.Request,
  res: express.Response,
  next: NextFunction,
): void => {
  try {
    const { userId, sessionId } = getAuth(req)

    if (!userId || !sessionId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
      return
    }

    req.auth = { userId, sessionId }
    next()
  } catch (error) {
    logger.error({
      msg: 'Authentication error',
      event: 'authentication_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process authentication',
    })
    return
  }
}

// Pino HTTP middleware
app.use(
  pinoHttp({
    logger: baseLogger,
    autoLogging: {
      ignore: (req) => req.method === 'OPTIONS',
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          body: req.method === 'POST' ? req.raw.body : undefined,
          query: req.query,
          params: req.params,
          headers: req.headers,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
        }
      },
    },
    customProps: (req, res) => ({
      context: {
        userId: req.auth?.userId,
        sessionId: req.auth?.sessionId,
      },
      performance: {
        responseTime: res.responseTime,
      },
    }),
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.secret',
    ],
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} - ${res.statusCode}`
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`
    },
  }),
)

// Cors middleware
app.use(
  cors({
    origin: process.env.FRONTEND_BASE_URL,
    credentials: true,
  }),
)

// Healthcheck route
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok' })
})

// Web routes
app.use('/web', isAuthenticated, webRoutes)

// Start server
const PORT = Number.parseInt(process.env.PORT || '3030', 10)
app.listen(PORT, '::', () => {
  logger.info({
    msg: `Server running on port ${PORT} (IPv4/IPv6)`,
    event: 'server_started',
  })
})
