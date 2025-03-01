import 'dotenv/config'
import { clerkMiddleware, getAuth } from '@clerk/express'
import { type LogContext, baseLogger, logger } from '@ritchy/logger'
import cors from 'cors'
import { eq } from 'drizzle-orm'
import express, { type NextFunction } from 'express'
import pinoHttp from 'pino-http'
import { db } from './db/db'
import { user as userTable } from './db/schema'
import { ensureIdempotency } from './middleware/idempotency'
import webRoutes from './routes_web'
import webhookRoutes from './webhook'

const app = express()

// Body parser middleware
app.use(
  express.json({
    verify: (req: express.Request, _res, buf) => {
      req.rawBody = buf
    },
  }),
)

// Clerk middleware
app.use(clerkMiddleware())

// Authentication middleware
const isAuthenticated = async (
  req: express.Request,
  res: express.Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId, sessionId } = getAuth(req)

    if (!userId || !sessionId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
      return
    }

    const [user] = await db
      .select({
        id: userTable.id,
        clerkId: userTable.clerkId,
        email: userTable.email,
        firstName: userTable.firstName,
        lastName: userTable.lastName,
        createdAt: userTable.createdAt,
        updatedAt: userTable.updatedAt,
      })
      .from(userTable)
      .where(eq(userTable.clerkId, userId))

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      })
      return
    }

    req.auth = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      sessionId,
    }

    // Wrap the rest of the request handling in a context with user information
    logger.runWithContext(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
        },
      },
      () => next(),
    )
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
    // Minimal request serialization
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          body: req.method === 'POST' ? req.raw.body : undefined,
          query: req.query,
          params: req.params,
        }
      },
    },
    // Only include essential custom props
    customProps: (req) => ({
      user: {
        userId: req.auth?.userId,
        sessionId: req.auth?.sessionId,
        firstName: req.auth?.firstName,
        lastName: req.auth?.lastName,
        email: req.auth?.email,
      },
    }),
    // Redact sensitive data
    redact: ['req.headers'],
    // Simple log messages
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.baseUrl}${req.url} - ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.baseUrl}${req.url} - ${res.statusCode} - ${err.message}`,
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

// Webhook route
app.use('/webhook', ensureIdempotency, webhookRoutes)

// Start server
const PORT = Number.parseInt(process.env.PORT || '3030', 10)
app.listen(PORT, '::', () => {
  logger.info({
    msg: `Server running on port ${PORT} (IPv4/IPv6)`,
    event: 'server_started',
  })
})
