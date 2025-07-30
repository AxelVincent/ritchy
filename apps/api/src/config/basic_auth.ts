import { z } from 'zod'

const envSchema = z.object({
  QUEUE_DASH_USERNAME: z.string().min(1),
  QUEUE_DASH_PASSWORD: z.string().min(1),
})

const BASIC_AUTH = envSchema.parse(process.env)

export const BASIC_AUTH_CONFIG = {
  username: BASIC_AUTH.QUEUE_DASH_USERNAME,
  password: BASIC_AUTH.QUEUE_DASH_PASSWORD,
} as const
