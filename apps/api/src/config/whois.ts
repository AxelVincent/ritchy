import { z } from 'zod'

const envSchema = z.object({
  WHOIS_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const WHOIS_CONFIG = {
  API_KEY: env.WHOIS_API_KEY,
  BASE_URL: 'https://whoisjsonapi.com/v1',
  RATE_LIMIT: {
    REQUESTS_PER_SECOND: 50,
    BURST_CAPACITY: 50,
  },
} as const
