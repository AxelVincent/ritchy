import { z } from 'zod'

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const OPENAI_CONFIG = {
  API_KEY: env.OPENAI_API_KEY,
}
