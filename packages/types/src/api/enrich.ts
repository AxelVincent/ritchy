import { z } from 'zod'
import { ApiErrorResponseSchema } from '../common'
import {
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  MessageCircle,
  Camera,
  Globe,
  type LucideIcon
} from 'lucide-react'

type SocialMediaConfigType = {
  [K: string]: {
    domain: string
    icon: LucideIcon
  }
}

export const SOCIAL_MEDIA_CONFIG: SocialMediaConfigType = {
  facebook: { domain: 'facebook.com', icon: Facebook },
  twitter: { domain: 'twitter.com', icon: Twitter },
  linkedin: { domain: 'linkedin.com', icon: Linkedin },
  instagram: { domain: 'instagram.com', icon: Instagram },
  youtube: { domain: 'youtube.com', icon: Youtube },
  tiktok: { domain: 'tiktok.com', icon: MessageCircle },
  pinterest: { domain: 'pinterest.com', icon: Camera },
  reddit: { domain: 'reddit.com', icon: Globe },
  snapchat: { domain: 'snapchat.com', icon: Camera }
} as const

// Basic/Common Schemas
const SocialMediaPlatformEnum = z.enum(
  Object.keys(SOCIAL_MEDIA_CONFIG) as [string, ...string[]]
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

// Add type for the config
export type SocialMediaPlatform = keyof typeof SOCIAL_MEDIA_CONFIG
export type SocialMediaConfig =
  (typeof SOCIAL_MEDIA_CONFIG)[SocialMediaPlatform]
