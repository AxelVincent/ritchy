import { z } from 'zod'

const envSchema = z.object({
  ICYPEAS_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const ICYPEAS_CONFIG = {
  API_KEY: env.ICYPEAS_API_KEY,
  BASE_URL: 'https://app.icypeas.com/api',
  SYNC_BASE_URL: 'https://app.icypeas.com/api/sync',
}
