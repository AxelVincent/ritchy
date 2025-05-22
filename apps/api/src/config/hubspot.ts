import { z } from "zod"

const envSchema = z.object({
  HUBSPOT_CLIENT_SECRET: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const HUBSPOT_CONFIG = {
  API_KEYS: {
    CLIENT_SECRET: env.HUBSPOT_CLIENT_SECRET,
  },
} as const
