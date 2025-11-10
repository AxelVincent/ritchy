import { z } from 'zod'

const envSchema = z.object({
  FORAGER_API_KEY: z.string().min(1),
  FORAGER_ACCOUNT_ID: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const FORAGER_CONFIG = {
  API_KEY: env.FORAGER_API_KEY,
  ACCOUNT_ID: env.FORAGER_ACCOUNT_ID,
  BASE_URL: 'https://api-v2.forager.ai/api',
}
