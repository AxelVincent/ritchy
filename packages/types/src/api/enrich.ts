import { z } from 'zod'
import { ApiErrorResponseSchema } from '../common'

export const SOCIAL_MEDIA_CONFIG = {
  facebook: { domain: 'facebook.com' },
  twitter: { domain: 'twitter.com' },
  linkedin: { domain: 'linkedin.com' },
  instagram: { domain: 'instagram.com' },
  youtube: { domain: 'youtube.com' },
  tiktok: { domain: 'tiktok.com' },
  pinterest: { domain: 'pinterest.com' },
  reddit: { domain: 'reddit.com' },
  snapchat: { domain: 'snapchat.com' }
} as const

// Basic/Common Schemas
const SocialMediaPlatformEnum = z.enum(
  Object.keys(SOCIAL_MEDIA_CONFIG) as [
    keyof typeof SOCIAL_MEDIA_CONFIG,
    ...(keyof typeof SOCIAL_MEDIA_CONFIG)[]
  ]
)

// API Request/Response Schemas
export const EnrichRequestSchema = z.object({
  website: z.string().url()
})

export const EnrichResponseSchema = z.object({
  emails: z.array(z.string().email()),
  socialLinks: z.record(SocialMediaPlatformEnum, z.array(z.string().url()))
})

export const EnrichApiResponseSchema = z.union([
  EnrichResponseSchema,
  ApiErrorResponseSchema
])

// Type inference from schemas
export type EnrichRequestQuery = z.infer<typeof EnrichRequestSchema>
export type EnrichResponse = z.infer<typeof EnrichResponseSchema>
export type EnrichApiResponse = z.infer<typeof EnrichApiResponseSchema>
