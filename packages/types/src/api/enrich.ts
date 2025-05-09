import {
  Camera,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  type LucideIcon,
  MessageCircle,
  Twitter,
  Video,
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
  vimeo: { domain: 'vimeo.com', icon: Video },
} as const

// API Request/Response Schemas
export const EnrichRequestSchema = z.object({
  id: z.string(),
  website: z.string().url(),
})

const EnrichResponseDataSchema = z.object({
  sector: z.string().optional(),
  tone: z.string().optional(),
  values: z.array(z.string()).optional(),
  description: z.string().optional(),
  social_networks: z.record(z.string(), z.string()).optional(),
  contact_info: z
    .object({
      address: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      contact_url: z.string().optional(),
    })
    .optional(),
  last_updated: z.string().optional(),
})

export type EnrichResponseData = z.infer<typeof EnrichResponseDataSchema>

export const EnrichResponseSchema = EnrichResponseDataSchema

export const EnrichApiResponseSchema = z.union([
  EnrichResponseSchema,
  ApiErrorResponseSchema,
])

// Type inference from schemas
export type EnrichRequestQuery = z.infer<typeof EnrichRequestSchema>
export type EnrichResponse = z.infer<typeof EnrichResponseSchema>
export type EnrichApiResponse = z.infer<typeof EnrichApiResponseSchema>

// Add type for the config
export type SocialMediaPlatform = keyof typeof SOCIAL_MEDIA_CONFIG
export type SocialMediaConfig =
  (typeof SOCIAL_MEDIA_CONFIG)[SocialMediaPlatform]
