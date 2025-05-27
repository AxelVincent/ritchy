import 'dotenv/config'
import { clerkMiddleware, getAuth } from '@clerk/express'
import { baseLogger, logger } from '@ritchy/logger'
import timeout from 'connect-timeout'
import cors from 'cors'
import { eq } from 'drizzle-orm'
import express, { type NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import { db } from './db/db'
import { user as userTable } from './db/schema'
import { ensureIdempotency } from './middleware/idempotency'
import { addRequestMetadata } from './middleware/request_metadata'
import webRoutes from './routes_web'
import webhookRoutes from './webhook'
import session from 'express-session'

const app = express()

// Body parser middleware
app.use(
  express.json({
    limit: '10mb',
    verify: (req: express.Request, _res, buf) => {
      req.rawBody = buf
    },
  }),
)

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  }),
)

// Clerk middleware
app.use(clerkMiddleware())

// Add session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}))

// Request metadata middleware
app.use(addRequestMetadata)

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
          // Limit body size in logs
          body: req.raw.body
            ? JSON.stringify(req.raw.body).slice(0, 1000)
            : undefined,
          query: req.raw.query,
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

// Add near the top of your middleware stack
app.use(helmet())

// Healthcheck route
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok' })
})

// Web routes
app.use('/web', isAuthenticated, webRoutes)

// Webhook route
app.use('/webhook', ensureIdempotency, webhookRoutes)


// Monitor long running requests
app.use((req, res, next) => {
  const start = process.hrtime()

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start)
    const duration = seconds * 1000 + nanoseconds / 1000000

    if (duration > 1000) {
      // Log requests taking more than 1 second
      logger.warn({
        msg: 'Long running request detected',
        event: 'long_request',
        metadata: {
          duration: `${duration}ms`,
          path: req.path,
          method: req.method,
        },
      })
    }
  })

  next()
})

// Monitor memory usage
const memoryThreshold = 512 // MB
let lastHeapUsed = 0

setInterval(() => {
  const used = process.memoryUsage()
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024)
  const heapDelta = heapUsedMB - lastHeapUsed

  logger.info({
    msg: 'Memory usage',
    event: 'memory_stats',
    metadata: {
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
      external: `${Math.round(used.external / 1024 / 1024)}MB`,
      arrayBuffers: `${Math.round(used.arrayBuffers / 1024 / 1024)}MB`,
      delta: `${heapDelta}MB`,
      timestamp: new Date().toISOString(),
    },
  })

  // Alert on significant increases
  if (heapDelta > memoryThreshold) {
    logger.warn({
      msg: 'Significant memory increase detected',
      event: 'memory_spike',
      metadata: { increase: `${heapDelta}MB` },
    })
  }

  lastHeapUsed = heapUsedMB
}, 900000) // Check every 15 minutes

// Start server
const PORT = Number.parseInt(process.env.PORT || '3030', 10)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})

app.use(limiter)

app.use(timeout('5s'))
app.use(haltOnTimedout)

function haltOnTimedout(
  req: express.Request,
  _res: express.Response,
  next: NextFunction,
) {
  if (!req.timedout) next()
}

app.listen(PORT, '::', () => {
  logger.info({
    msg: `Server running on port ${PORT} (IPv4/IPv6)`,
    event: 'server_started',
  })
})

process.on('uncaughtException', (error) => {
  logger.error({
    msg: 'Uncaught Exception',
    event: 'uncaught_exception',
    metadata: { error },
  })
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error({
    msg: 'Unhandled Rejection',
    event: 'unhandled_rejection',
    metadata: { reason, promise },
  })
})
