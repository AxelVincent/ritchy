import { z } from 'zod'

const envSchema = z.object({
  REDISHOST: z.string().default('localhost'),
  REDISPORT: z.string().default('6379'),
  REDISUSER: z.string().min(1),
  REDISPASSWORD: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const REDIS_CONFIG = {
  HOST: env.REDISHOST,
  PORT: Number.parseInt(env.REDISPORT),
  USER: env.REDISUSER,
  PASSWORD: env.REDISPASSWORD,
} as const
