import { z } from 'zod'

const envSchema = z.object({
  RUST_HTML_SERVICE_URL: z.string().url().default('http://localhost:3001'),
  RUST_HTML_SERVICE_API_KEY: z.string().min(1),
  RUST_HTML_SERVICE_TIMEOUT_MS: z.coerce.number().positive().default(30000),
})

const env = envSchema.parse(process.env)

export const RUST_HTML_SERVICE_CONFIG = {
  URL: env.RUST_HTML_SERVICE_URL,
  API_KEY: env.RUST_HTML_SERVICE_API_KEY,
  TIMEOUT_MS: env.RUST_HTML_SERVICE_TIMEOUT_MS,
}
