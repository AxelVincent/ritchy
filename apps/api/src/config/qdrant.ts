import { z } from 'zod'

const envSchema = z.object({
  QDRANT_API_KEY: z.string().min(1),
  QDRANT_URL: z.string().min(1),
  QDRANT_COLLECTION_NAME: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const QDRANT_CONFIG = {
  API_KEY: env.QDRANT_API_KEY,
  URL: env.QDRANT_URL,
  COLLECTION_NAME: env.QDRANT_COLLECTION_NAME,
}
