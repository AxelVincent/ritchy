import { z } from 'zod'

const envSchema = z.object({
  MILLION_VERIFIER_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const MILLION_VERIFIER_CONFIG = {
  API_KEY: env.MILLION_VERIFIER_API_KEY,
}
