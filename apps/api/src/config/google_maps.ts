import { z } from 'zod'

const envSchema = z.object({
  GOOGLE_PLACES_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const GOOGLE_MAPS_CONFIG = {
  API_KEY: env.GOOGLE_PLACES_API_KEY,
  BASE_URL: 'https://places.googleapis.com/v1',
} as const
