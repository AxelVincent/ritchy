import 'dotenv/config'

import { createServer } from 'node:http'
import { clerkMiddleware, getAuth } from '@clerk/express'
import { createQueueDashExpressMiddleware } from '@queuedash/api'
import { baseLogger, logger } from '@ritchy/logger'
import { createHttpMetricsMiddleware } from '@ritchy/metrics'
import timeout from 'connect-timeout'
import cors from 'cors'
import { eq } from 'drizzle-orm'
import express, { type NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import { db } from './db/db'
import { user as userTable } from './db/schema'
import { initQdrantCollection } from './external/qdrant'
import { redisHealthMonitor } from './internal/redis/health-monitor'
import { metricsRegistry } from './metrics/registry'
import { ensureRegistryInitialized, getRegistry } from './metrics/singleton'
import { basicAuth } from './middleware/basic_auth'
import { addRequestMetadata } from './middleware/request_metadata'
import webRoutes from './routes_web'
import webhookRoutes from './webhook'

import {
  startQueueCleanupScheduler,
  stopQueueCleanupScheduler,
} from './internal/bullmq/cleanup'
// Import BullMQ queues only (for queue dashboard and job enqueueing)
// Workers run in a separate process via: pnpm dev:workers / pnpm start:workers
import { bullmqQueues } from './internal/bullmq/queues'

import { AdaptivePollingConsumer } from './internal/redis/polling-consumer'
import websocketHealthRoutes from './routes/websocket-health'
import {
  emitStatusUpdateToWebSocket,
  setEnrichmentNamespace,
} from './services/enrichment/status_manager'
import { setupEnrichmentNamespace } from './websocket/enrichment-namespace'
// Import WebSocket server setup
import { createWebSocketServer } from './websocket/server'

// Initialize aggregated metrics registry (auto-initializing singleton)
// This allows metrics from workers to be aggregated with API metrics
const aggregatedRegistry = ensureRegistryInitialized()

logger.info({
  msg: 'Aggregated metrics registry initialized',
  event: 'aggregated_metrics_initialized',
  metadata: { processId: 'api' },
})

const app = express()
const server = createServer(app)

// Initialize WebSocket server
const io = createWebSocketServer(server)
const enrichmentNs = setupEnrichmentNamespace(io)

// Make enrichment namespace accessible to status manager
setEnrichmentNamespace(enrichmentNs)

// Create adaptive polling consumer for worker status updates
const pollingConsumer = new AdaptivePollingConsumer(
  (message) => emitStatusUpdateToWebSocket(message),
  {
    minIntervalMs: 10,
    maxIntervalMs: 200,
    batchSize: 50,
  },
)

// Start the polling consumer
pollingConsumer.start().catch((error) => {
  logger.error({
    msg: 'Failed to start polling consumer',
    event: 'polling_consumer_start_error',
    metadata: { error: error instanceof Error ? error.message : String(error) },
  })
})

logger.info({
  msg: 'WebSocket server initialized with adaptive polling consumer',
  event: 'websocket_initialized',
})

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

// Clerk middleware - this handles session management
app.use(clerkMiddleware())

// Request metadata middleware
app.use(addRequestMetadata)

// Metrics middleware - track HTTP requests
app.use(
  createHttpMetricsMiddleware(metricsRegistry, {
    prefix: 'ritchy_',
    routeExtractor: (req) => {
      // Express doesn't provide route patterns for nested routers in req.baseUrl
      // req.baseUrl contains actual values like "/web/places/123abc/notes"
      // We need to reconstruct the pattern by replacing param values with placeholders

      if (!req.route) {
        return req.path
      }

      // Get the full actual path (baseUrl + route.path)
      const actualPath = req.baseUrl + req.route.path

      // Replace all parameter values with their :paramName placeholders
      let pattern = actualPath

      for (const [paramName, paramValue] of Object.entries(req.params)) {
        // Replace the actual value with :paramName placeholder
        // Use a regex to only replace full path segments
        const valueStr = String(paramValue)
        pattern = pattern.replace(
          new RegExp(`/${valueStr}(?=/|$)`, 'g'),
          `/:${paramName}`,
        )
      }

      return pattern
    },
    shouldTrack: (req) => req.method !== 'OPTIONS',
    // Note: We don't include user_id in labels to avoid cardinality explosion
    // (one metric series per user would be too many for Prometheus)
    // User-specific metrics should be tracked separately if needed
    extraLabels: () => ({}),
  }),
)

// Authentication middleware
const isAuthenticated = async (
  req: express.Request,
  res: express.Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId, sessionId, getToken } = getAuth(req)
    const token = await getToken()

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
      clerkId: userId,
      token: token ?? '',
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

// Replace the simple helmet() call with a configured version
app.use(helmet())

// Healthcheck routes
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok' })
})

// WebSocket health check
app.use(websocketHealthRoutes)

// Metrics endpoint for Prometheus (protected with Basic Auth)
// Uses aggregated registry to combine metrics from API + worker processes
app.get('/metrics', async (req, res) => {
  // Basic Auth protection
  const username = process.env.METRICS_USERNAME
  const password = process.env.METRICS_PASSWORD

  if (username && password) {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.set('WWW-Authenticate', 'Basic realm="Metrics"')
      res.status(401).end('Authentication required')
      return
    }

    try {
      const base64Credentials = authHeader.split(' ')[1]
      const credentials = Buffer.from(base64Credentials, 'base64').toString(
        'utf-8',
      )
      const [user, pass] = credentials.split(':')

      const usernameMatch =
        user.length === username.length &&
        Buffer.from(user).equals(Buffer.from(username))
      const passwordMatch =
        pass.length === password.length &&
        Buffer.from(pass).equals(Buffer.from(password))

      if (!usernameMatch || !passwordMatch) {
        res.set('WWW-Authenticate', 'Basic realm="Metrics"')
        res.status(401).end('Invalid credentials')
        return
      }
    } catch {
      res.set('WWW-Authenticate', 'Basic realm="Metrics"')
      res.status(401).end('Invalid authorization header')
      return
    }
  }

  try {
    res.set('Content-Type', aggregatedRegistry.contentType)
    const metrics = await aggregatedRegistry.metrics()
    res.end(metrics)
  } catch (error) {
    logger.error({
      msg: 'Failed to collect aggregated metrics',
      event: 'metrics_collection_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
    res.status(500).end('Error collecting metrics')
  }
})

// Web routes
app.use('/web', isAuthenticated, webRoutes)

// Webhook route
app.use('/webhook', webhookRoutes)

// QueueDash middleware
app.use(
  '/queuedash',
  (_req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://unpkg.com",
        "style-src 'self' 'unsafe-inline' https://unpkg.com",
        "connect-src 'self' https://unpkg.com",
        "img-src 'self' data: https://unpkg.com",
      ].join('; '),
    )
    next()
  },
  basicAuth,
  createQueueDashExpressMiddleware({
    ctx: {
      queues: bullmqQueues,
    },
  }),
)

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

// Initialize Qdrant collection
initQdrantCollection().then(() => {
  logger.info({
    msg: 'Qdrant collection initialized successfully',
    event: 'qdrant_collection_initialized',
  })
})

// Start Redis health monitor
redisHealthMonitor.start(1000 * 60 * 15) // Check every 15 minutes

// Start BullMQ queue cleanup scheduler
startQueueCleanupScheduler()

// Then start the server
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

server.listen(PORT, '::', () => {
  logger.info({
    msg: `Server running on port ${PORT} (IPv4/IPv6) with WebSocket support`,
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

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info({
    msg: `Shutting down services (${signal})`,
    event: 'graceful_shutdown_start',
  })

  // Stop the polling consumer
  await pollingConsumer.stop()

  // Final sync of aggregated metrics before shutdown
  const registry = getRegistry()
  if (registry) {
    try {
      await registry.sync()
      registry.stopSync()
    } catch (error) {
      logger.error({
        msg: 'Failed to sync metrics during shutdown',
        event: 'metrics_shutdown_error',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }

  // Shutdown Redis health monitor
  redisHealthMonitor.stop()

  // Stop BullMQ queue cleanup scheduler
  stopQueueCleanupScheduler()

  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
