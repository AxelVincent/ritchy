import { z } from 'zod'

const rabbitMQEnvSchema = z.object({
  RABBITMQ_HOST: z.string().default('localhost'),
  RABBITMQ_PORT: z.string().default('5672'),
  RABBITMQ_USER: z.string().default('admin'),
  RABBITMQ_PASSWORD: z.string().default('password'),
  RABBITMQ_VHOST: z.string().default('/'),
})

const env = rabbitMQEnvSchema.parse(process.env)

export const RABBITMQ_CONFIG = {
  HOST: env.RABBITMQ_HOST,
  PORT: Number.parseInt(env.RABBITMQ_PORT),
  USER: env.RABBITMQ_USER,
  PASSWORD: env.RABBITMQ_PASSWORD,
  VHOST: env.RABBITMQ_VHOST,
  URL: `amqp://${env.RABBITMQ_USER}:${env.RABBITMQ_PASSWORD}@${env.RABBITMQ_HOST}:${env.RABBITMQ_PORT}/${env.RABBITMQ_VHOST}`,
} as const

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
