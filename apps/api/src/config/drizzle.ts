import { z } from 'zod'

const envSchema = z.object({
  PGHOST: z.string(),
  PGPORT: z.string(),
  PGDATABASE: z.string(),
  PGUSER: z.string(),
  PGPASSWORD: z.string(),
  PG_PUBLIC_URL: z.string(),
})

const env = envSchema.parse(process.env)

export const DRIZZLE_CONFIG = {
  HOST: env.PGHOST,
  PORT: Number(env.PGPORT),
  DATABASE: env.PGDATABASE,
  USER: env.PGUSER,
  PASSWORD: env.PGPASSWORD,
  PUBLIC_URL: env.PG_PUBLIC_URL,
} as const
