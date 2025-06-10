import { z } from 'zod'

const envSchema = z.object({
  HUBSPOT_CLIENT_ID: z.string().min(1),
  HUBSPOT_CLIENT_SECRET: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const HUBSPOT_CONFIG = {
  CLIENT_ID: env.HUBSPOT_CLIENT_ID,
  CLIENT_SECRET: env.HUBSPOT_CLIENT_SECRET,
  REDIRECT_URI: new URL(
    `${process.env.FRONTEND_BASE_URL}/integrations/hubspot/callback`,
  ).toString(),
  API: {
    BASE_URL: 'https://api.hubapi.com',
    AUTH_URL: 'https://app.hubspot.com/oauth/authorize',
    TOKEN_URL: 'https://api.hubapi.com/oauth/v1/token',
  },
  CACHE: {
    TTL: 30 * 60 * 1000, // 30 minutes
    REFRESH_THRESHOLD: 15 * 60 * 1000, // 15 minutes before expiration
  },
  SCOPES: [
    'crm.objects.companies.read',
    'crm.objects.companies.write',
    'crm.schemas.custom.read',
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
  ],
} as const
