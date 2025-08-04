import { z } from 'zod'

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  MISTRAL_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  GOOGLE_AI_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const LLM_CONFIG = {
  OPENAI_API_KEY: env.OPENAI_API_KEY,
  MISTRAL_API_KEY: env.MISTRAL_API_KEY,
  ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
  GOOGLE_AI_API_KEY: env.GOOGLE_AI_API_KEY,
}
