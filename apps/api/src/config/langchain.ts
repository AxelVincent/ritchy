import { z } from 'zod'

const envSchema = z.object({
  LANGSMITH_API_KEY: z.string().min(1),
  LANGSMITH_TRACING: z.boolean().default(false),
  MODELS: z.object({
    MISTRAL_API_KEY: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
  }),
})

const env = envSchema.parse(process.env)

export const LANGCHAIN_CONFIG = {
  LANGSMITH_API_KEY: env.LANGSMITH_API_KEY,
  LANGSMITH_TRACING: env.LANGSMITH_TRACING,
  MODELS: {
    MISTRAL_API_KEY: env.MODELS.MISTRAL_API_KEY,
    ANTHROPIC_API_KEY: env.MODELS.ANTHROPIC_API_KEY,
  },
}
