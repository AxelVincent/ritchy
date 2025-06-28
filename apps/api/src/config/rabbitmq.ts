import { logger } from '@ritchy/logger'
import { z } from 'zod'

const rabbitMQEnvSchema = z.object({
  RABBITMQ_HOST: z
    .string()
    .min(1, 'RabbitMQ host is required')
    .default('localhost'),
  RABBITMQ_PORT: z
    .string()
    .regex(/^\d+$/, 'RabbitMQ port must be a valid number')
    .default('5672'),
  RABBITMQ_USER: z
    .string()
    .min(1, 'RabbitMQ user is required')
    .default('admin'),
  RABBITMQ_PASSWORD: z
    .string()
    .min(1, 'RabbitMQ password is required')
    .default('password'),
  RABBITMQ_VHOST: z.string().default('/'),
})

const env = rabbitMQEnvSchema.parse(process.env)

export const RABBITMQ_CONFIG = {
  HOST: env.RABBITMQ_HOST,
  PORT: Number.parseInt(env.RABBITMQ_PORT),
  USER: env.RABBITMQ_USER,
  PASSWORD: env.RABBITMQ_PASSWORD,
  VHOST: env.RABBITMQ_VHOST,
} as const

/**
 * Creates a safe connection URL for logging (without credentials)
 * @returns Connection URL safe for logging
 */
export const createSafeConnectionUrl = (): string => {
  return `amqp://***:***@${RABBITMQ_CONFIG.HOST}:${RABBITMQ_CONFIG.PORT}${RABBITMQ_CONFIG.VHOST}`
}

/**
 * Creates connection options object (alternative to URL-based auth)
 * This approach keeps credentials separate from the connection string
 */
export const createConnectionOptions = () => ({
  protocol: 'amqp',
  hostname: RABBITMQ_CONFIG.HOST,
  port: RABBITMQ_CONFIG.PORT,
  username: RABBITMQ_CONFIG.USER,
  password: RABBITMQ_CONFIG.PASSWORD,
  vhost: RABBITMQ_CONFIG.VHOST,
  heartbeat: 5,
  timeout: 10000,
})

// Queue configuration
export const QUEUE_CONFIG = {
  ENRICHMENT_QUEUE: 'enrichment-batch',
  ENRICHMENT_DLQ: 'enrichment-batch-dlq',
  CONCURRENT_ITEMS: 16,
  CHUNK_DELAY_MS: 100,
  CONCURRENT_JOBS: 4,
  MESSAGE_TTL: 24 * 60 * 60 * 1000,
  MAX_RETRIES: 3,
} as const

// Type definitions
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

export type QueueMessage<T = unknown> = {
  id: string
  data: T
  timestamp: number
  retryCount: number
}

export type JobProcessor<T = unknown> = (
  data: T,
  messageId: string,
) => Promise<unknown>

export type QueueStats = {
  messageCount: number
  consumerCount: number
}

export type QueueHealth = {
  isConnected: boolean
  mainQueue: QueueStats
  deadLetterQueue: QueueStats
}

/**
 * Simple RabbitMQ startup validation
 */
export const validateRabbitMQAtStartup = async (): Promise<void> => {
  try {
    logger.info({
      msg: 'Validating RabbitMQ configuration and connectivity',
      event: 'rabbitmq_startup_validation_start',
      metadata: {
        connectionUrl: createSafeConnectionUrl(),
        config: {
          host: RABBITMQ_CONFIG.HOST,
          port: RABBITMQ_CONFIG.PORT,
          vhost: RABBITMQ_CONFIG.VHOST,
          user: RABBITMQ_CONFIG.USER ? '***' : 'undefined',
          password: RABBITMQ_CONFIG.PASSWORD ? '***' : 'undefined',
        },
      },
    })

    // Test connection using secure connection options
    const amqp = await import('amqplib')
    const connection = await amqp.connect(createConnectionOptions())
    const channel = await connection.createChannel()
    await channel.close()
    await connection.close()

    logger.info({
      msg: 'RabbitMQ validation successful',
      event: 'rabbitmq_startup_validation_success',
      metadata: {
        host: RABBITMQ_CONFIG.HOST,
        port: RABBITMQ_CONFIG.PORT,
        vhost: RABBITMQ_CONFIG.VHOST,
      },
    })
  } catch (error) {
    // Enhanced error handling to capture more details
    let errorMessage = 'Unknown error'
    let errorType = 'unknown'
    let errorCode = 'unknown'

    if (error instanceof Error) {
      errorMessage = error.message || 'Error object with no message'
      errorType = error.constructor.name
      errorCode = (error as { code?: string }).code || 'no_code'
    } else if (typeof error === 'string') {
      errorMessage = error
      errorType = 'string'
    } else if (error !== null && error !== undefined) {
      errorMessage = String(error)
      errorType = typeof error
    } else {
      errorMessage = 'Null or undefined error'
      errorType = error === null ? 'null' : 'undefined'
    }

    logger.error({
      msg: 'RabbitMQ validation failed',
      event: 'rabbitmq_startup_validation_error',
      metadata: {
        error: errorMessage,
        errorType,
        errorCode,
        fullError: error,
        config: {
          host: RABBITMQ_CONFIG.HOST,
          port: RABBITMQ_CONFIG.PORT,
          vhost: RABBITMQ_CONFIG.VHOST,
        },
      },
    })

    throw new Error(
      `RabbitMQ validation failed: ${errorMessage} (type: ${errorType}, code: ${errorCode})`,
    )
  }
}
