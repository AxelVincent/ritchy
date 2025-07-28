import { z } from 'zod'

const envSchema = z.object({
  QDRANT_API_KEY: z.string().min(1),
  QDRANT_USER: z.string().min(1),
  QDRANT_PORT: z.string().min(1),
  QDRANT_MANAGEMENT_PORT: z.string().min(1),
  QDRANT_API_PORT: z.string().min(1),
  QDRANT_HOST: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const QDRANT_CONFIG = {
  API_KEY: env.QDRANT_API_KEY,
  USER: env.QDRANT_USER,
  PORT: env.QDRANT_PORT,
  MANAGEMENT_PORT: env.QDRANT_MANAGEMENT_PORT,
  API_PORT: env.QDRANT_API_PORT,
  HOST: env.QDRANT_HOST,
}
