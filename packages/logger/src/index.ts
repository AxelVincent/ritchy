import pino from 'pino'

interface LogPayload {
  msg: string
  event: string
  metadata?: Record<string, unknown>
}

const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'development'
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
  ...(process.env.NODE_ENV === 'development' && {
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    messageKey: 'msg',
    singleLine: true,
  }),
  serializers: pino.stdSerializers,
})

// Wrap the logger to enforce the payload structure
const logger = {
  info: (payload: LogPayload) => baseLogger.info(payload),
  error: (payload: LogPayload) => baseLogger.error(payload),
  warn: (payload: LogPayload) => baseLogger.warn(payload),
  debug: (payload: LogPayload) => baseLogger.debug(payload),
}

export { logger, baseLogger }
