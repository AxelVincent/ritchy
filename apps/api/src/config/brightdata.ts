import { z } from 'zod'

const envSchema = z.object({
  BRIGHTDATA_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const BRIGHTDATA_CONFIG = {
  API_KEY: env.BRIGHTDATA_API_KEY,
} as const
