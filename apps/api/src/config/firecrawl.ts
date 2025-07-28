import { z } from 'zod'

const envSchema = z.object({
  FIRECRAWL_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const FIRECRAWL_CONFIG = {
  API_KEY: env.FIRECRAWL_API_KEY,
}
