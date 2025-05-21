import { z } from 'zod'

const envSchema = z.object({
  WEBSITE_ANALYZER_URL: z.string().min(1),
  WEBSITE_ANALYZER_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

// Configuration
export const WEBSITE_ANALYZER_CONFIG = {
  ANALYZER_URL: env.WEBSITE_ANALYZER_URL,
  API_KEY: env.WEBSITE_ANALYZER_API_KEY,
} as const
