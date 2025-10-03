import { z } from 'zod'

const envSchema = z.object({
  PAPPERS_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const PAPPERS_CONFIG = {
  API_KEY: env.PAPPERS_API_KEY,
  BASE_URL: 'https://api.pappers.in',
}
