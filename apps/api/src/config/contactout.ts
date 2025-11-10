import { z } from 'zod'

const envSchema = z.object({
  CONTACTOUT_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const CONTACTOUT_CONFIG = {
  API_KEY: env.CONTACTOUT_API_KEY,
  BASE_URL: 'https://api.contactout.com/v1',
}
