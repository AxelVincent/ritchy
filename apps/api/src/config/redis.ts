import { z } from 'zod'

const envSchema = z.object({
  REDISHOST: z.string().default('localhost'),
  REDISPORT: z.string().default('6379'),
  REDISUSER: z.string().min(1),
  REDISPASSWORD: z.string().min(1),
  REDIS_PUBLIC_URL: z.string(),
})

const env = envSchema.parse(process.env)

export const REDIS_CONFIG = {
  HOST: env.REDISHOST,
  PORT: Number.parseInt(env.REDISPORT),
  USER: env.REDISUSER,
  PASSWORD: env.REDISPASSWORD,
  PUBLIC_URL: env.REDIS_PUBLIC_URL,
} as const

// Cache update thresholds (in seconds)
export const CACHE_THRESHOLDS = {
  PLACE_UPDATE_THRESHOLD: 24 * 60 * 60 * 90, // 90 days
} as const
