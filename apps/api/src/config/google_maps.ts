import { z } from 'zod'

const envSchema = z.object({
  GOOGLE_PLACES_API_KEY: z.string().min(1),
  GOOGLE_GEOCODING_API_KEY: z.string().min(1),
  GOOGLE_PLACES_REFERRER: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const GOOGLE_MAPS_CONFIG = {
  PLACES_API_KEY: env.GOOGLE_PLACES_API_KEY,
  GEOCODING_API_KEY: env.GOOGLE_GEOCODING_API_KEY,
  PLACES_URL: 'https://places.googleapis.com/v1',
  MAPS_URL: 'https://maps.googleapis.com',
  REFERRER: env.GOOGLE_PLACES_REFERRER,
} as const
