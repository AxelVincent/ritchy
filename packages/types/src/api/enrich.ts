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

const BusinessInfoSchema = z.object({
  name: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  registration_info: z.string().nullable().optional(),
  structure: z.string().nullable().optional(),
  founded: z.string().nullable().optional(),
  languages: z.array(z.string()).nullable().default([]),
  source: z.string().url().nullable().optional(),
})

const ProductsServicesSchema = z.object({
  specialties: z.array(z.string()).nullable().default([]),
  price_range: z.string().nullable().optional(),
  service_area: z.string().nullable().optional(),
  source: z.string().url().nullable().optional(),
})

const TargetCustomersSchema = z.object({
  primary_segments: z.array(z.string()).nullable().default([]),
  needs_addressed: z.array(z.string()).nullable().default([]),
  key_benefits: z.array(z.string()).nullable().default([]),
  b2c_focus: z.string().nullable().optional(),
  b2b_focus: z.string().nullable().optional(),
  source: z.string().url().nullable().optional(),
})

const ContactInfoSchema = z.object({
  address: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  contact_form_url: z.string().url().nullable().optional(),
  visit_info: z.string().nullable().optional(),
  source: z.string().url().nullable().optional(),
})

const SocialNetworksSchema = z.object({
  facebook: z.string().url().nullable().optional(),
  instagram: z.string().url().nullable().optional(),
  linkedin: z.string().url().nullable().optional(),
  twitter: z.string().url().nullable().optional(),
  source: z.string().url().nullable().optional(),
})

const MetadataSchema = z.object({
  total_tokens: z.number().default(0),
  total_cost: z.number().default(0),
  loop_cycles: z.number().default(0),
  tool_calls: z.number().default(0),
  token_reporting: z.string().default('api_cumulative'),
  final_step: z.string().default('initial'),
  crawled_urls: z.array(z.string()).default([]),
})

const EnrichResponseDataSchema = z.object({
  business_info: BusinessInfoSchema,
  products_services: ProductsServicesSchema,
  target_customers: TargetCustomersSchema,
  contact_info: ContactInfoSchema,
  social_networks: SocialNetworksSchema,
  last_updated: z.string().default(''),
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

// Export individual type schemas for reuse
export {
  BusinessInfoSchema,
  ProductsServicesSchema,
  TargetCustomersSchema,
  ContactInfoSchema,
  SocialNetworksSchema,
  MetadataSchema,
}

// Export individual types for reuse
export type BusinessInfo = z.infer<typeof BusinessInfoSchema>
export type ProductsServices = z.infer<typeof ProductsServicesSchema>
export type TargetCustomers = z.infer<typeof TargetCustomersSchema>
export type ContactInfo = z.infer<typeof ContactInfoSchema>
export type SocialNetworks = z.infer<typeof SocialNetworksSchema>
export type Metadata = z.infer<typeof MetadataSchema>
