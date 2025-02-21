import { AsyncLocalStorage } from 'node:async_hooks'
import pino from 'pino'

interface LogContext {
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
}

// Create AsyncLocalStorage to store context
const asyncLocalStorage = new AsyncLocalStorage<LogContext>()

interface LogPayload {
  msg: string
  event: string
  metadata?: Record<string, unknown>
}

const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
  ...(process.env.NODE_ENV !== 'development' && {
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    messageKey: 'msg',
    singleLine: true,
  }),
  serializers: pino.stdSerializers,
})

// Wrap the logger to enforce the payload structure and inject context
const logger = {
  info: (payload: LogPayload) => {
    const context = asyncLocalStorage.getStore()
    baseLogger.info({ ...payload, ...(context || {}) })
  },
  error: (payload: LogPayload) => {
    const context = asyncLocalStorage.getStore()
    baseLogger.error({ ...payload, ...(context || {}) })
  },
  warn: (payload: LogPayload) => {
    const context = asyncLocalStorage.getStore()
    baseLogger.warn({ ...payload, ...(context || {}) })
  },
  debug: (payload: LogPayload) => {
    const context = asyncLocalStorage.getStore()
    baseLogger.debug({ ...payload, ...(context || {}) })
  },
  runWithContext: <T>(context: LogContext, fn: () => T): T => {
    return asyncLocalStorage.run(context, fn)
  },
}

export { logger, baseLogger, type LogContext }
