import {
  Camera,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  type LucideIcon,
  MessageCircle,
  Twitter,
  Youtube,
} from 'lucide-react'
import { z } from 'zod'
import { ApiErrorResponseSchema } from '../common'

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
  snapchat: { domain: 'snapchat.com', icon: Camera },
} as const

// Basic/Common Schemas
const SocialMediaPlatformEnum = z.enum(
  Object.keys(SOCIAL_MEDIA_CONFIG) as [string, ...string[]],
)

// Domain registration data schema
export const DomainRegistrationSchema = z.object({
  registrationDate: z.string().nullable(),
  registrar: z.string().nullable(),
  domainAge: z.number().nullable(),
  lastUpdated: z.string(),
})

// API Request/Response Schemas
export const EnrichRequestSchema = z.object({
  id: z.string(),
  website: z.string().url(),
})

export const EnrichResponseSchema = z.object({
  id: z.string(),
  emails: z.array(z.string().email()),
  socialLinks: z.record(SocialMediaPlatformEnum, z.array(z.string().url())),
  domainRegistration: DomainRegistrationSchema.optional(),
})

export const EnrichApiResponseSchema = z.union([
  EnrichResponseSchema,
  ApiErrorResponseSchema,
])

// Type inference from schemas
export type EnrichRequestQuery = z.infer<typeof EnrichRequestSchema>
export type EnrichResponse = z.infer<typeof EnrichResponseSchema>
export type EnrichApiResponse = z.infer<typeof EnrichApiResponseSchema>
export type DomainRegistration = z.infer<typeof DomainRegistrationSchema>

// Add type for the config
export type SocialMediaPlatform = keyof typeof SOCIAL_MEDIA_CONFIG
export type SocialMediaConfig =
  (typeof SOCIAL_MEDIA_CONFIG)[SocialMediaPlatform]
