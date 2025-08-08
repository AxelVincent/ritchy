import { z } from 'zod'

const envSchema = z.object({
  SCRAPELESS_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const SCRAPELESS_CONFIG = {
  API_KEY: env.SCRAPELESS_API_KEY,
}
