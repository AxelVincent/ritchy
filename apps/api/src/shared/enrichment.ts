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
import { PreferredPlaceSchema } from '../external/google_maps/types'
import { ApiErrorResponseSchema } from './common'
import { SocialMediaPlatformEnum } from './enums'
import { UrlSchema } from './schemas'

type SocialMediaConfigType = {
  [K: string]: {
    domain: string
    icon: LucideIcon
  }
}

export const PLATFORM_DOMAINS = [
  'twitter.com',
  'youtube.com',
  'tiktok.com',
  'pinterest.com',
  'reddit.com',
  'tumblr.com',
  'medium.com',
]

export const SOCIAL_MEDIA_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'linkedin.com',
]

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

// Domain registration data schema
export const DomainRegistrationSchema = z.object({
  registrationDate: z.string().nullable(),
  lastUpdated: z.string(),
})
export type DomainRegistration = z.infer<typeof DomainRegistrationSchema>

// API Request/Response Schemas
export const EnrichRequestSchema = z.object({
  id: z.string(),
  website: UrlSchema,
})

export const EnrichResponseSchema = z.object({
  id: z.string(),
  emails: z.array(z.string().email()),
  socialLinks: z.record(SocialMediaPlatformEnum, z.array(UrlSchema)),
  domainRegistration: DomainRegistrationSchema.optional(),
})

export const EnrichApiResponseSchema = z.union([
  EnrichResponseSchema,
  ApiErrorResponseSchema,
])

export type EnrichRequestQuery = z.infer<typeof EnrichRequestSchema>
export type EnrichResponse = z.infer<typeof EnrichResponseSchema>
export type EnrichApiResponse = z.infer<typeof EnrichApiResponseSchema>

// Company enrichment data
export const CompanyEnrichmentDataSchema = z.object({
  enrichmentId: z.string().uuid(),
  placeId: z.string().uuid(),

  // Complete Google Place data - uses the full PreferredPlaceSchema
  googlePlace: PreferredPlaceSchema.nullable(),

  domain: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  shortDescription: z.string().nullable(),
  domainRegisteredAt: z.string().datetime().nullable(),
  score: z.number().nullable(),

  company: z
    .object({
      companyNumber: z.string(),
      name: z.string(),
      tradeName: z.string().nullable(),
      legalFormCode: z.string().nullable(),
      status: z.string(),
      dateOfCreation: z.string().datetime().nullable(),
      workforce: z.number().nullable(),
      workforceRange: z.string().nullable(),
      shareCapital: z.string().nullable(),
      confidenceScore: z.number().nullable(),
      headOffice: z
        .object({
          addressLine1: z.string().nullable(),
          addressLine2: z.string().nullable(),
          city: z.string().nullable(),
          postalCode: z.string().nullable(),
          country: z.string().nullable(),
        })
        .nullable(),
    })
    .nullable(),

  officers: z.array(
    z.object({
      id: z.string().uuid(),
      type: z.string().nullable(),
      role: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      enrichmentStatus: z.string(),
    }),
  ),

  technologies: z.array(
    z.object({
      technology: z.string(),
      category: z.string(),
      confidence: z.number(),
    }),
  ),

  socialLinks: z.object({
    linkedins: z.array(z.string()),
    facebooks: z.array(z.string()),
    instagrams: z.array(z.string()),
  }),

  emails: z.array(
    z.object({
      email: z.string(),
      quality: z.string().nullable(),
      role: z.boolean(),
      free: z.boolean(),
    }),
  ),

  phones: z.array(
    z.object({
      phone: z.string(),
      type: z.string(),
    }),
  ),

  creditsUsed: z.number(),
  enrichedAt: z.string().datetime().nullable(),
})

export type CompanyEnrichmentData = z.infer<typeof CompanyEnrichmentDataSchema>

export const CompanyEnrichmentResponseSchema = z.object({
  success: z.boolean(),
  alreadyEnriched: z.boolean(),
  data: CompanyEnrichmentDataSchema.nullable(),
})

export type CompanyEnrichmentResponse = z.infer<
  typeof CompanyEnrichmentResponseSchema
>

// Contact enrichment data
export const ContactEnrichmentDataSchema = z.object({
  contactId: z.string().uuid(),
  officerId: z.string().uuid(),

  linkedin: z
    .object({
      profileUrl: z.string(),
      confidence: z.number(),
      reasoning: z.string().nullable(),
      source: z.string(),
    })
    .nullable(),

  emails: z.array(
    z.object({
      email: z.string(),
      isVerified: z.boolean(),
      quality: z.string().nullable(),
      role: z.boolean(),
      free: z.boolean(),
      source: z.string().nullable(),
    }),
  ),

  phones: z.array(
    z.object({
      phone: z.string(),
      source: z.string(),
    }),
  ),

  credits: z.object({
    used: z.number(),
    breakdown: z.object({
      linkedin: z.number(),
      emails: z.number(),
      phones: z.number(),
    }),
  }),

  enrichedAt: z.string().datetime().nullable(),
})

export type ContactEnrichmentData = z.infer<typeof ContactEnrichmentDataSchema>

export const ContactEnrichmentResponseSchema = z.object({
  success: z.boolean(),
  alreadyEnriched: z.boolean(),
  data: ContactEnrichmentDataSchema.nullable(),
})

export type ContactEnrichmentResponse = z.infer<
  typeof ContactEnrichmentResponseSchema
>

// Add type for the config
export type SocialMediaPlatformLegacy = keyof typeof SOCIAL_MEDIA_CONFIG
export type SocialMediaConfig =
  (typeof SOCIAL_MEDIA_CONFIG)[keyof typeof SOCIAL_MEDIA_CONFIG]

// ============================================================================
// Public API Request Schemas
// ============================================================================

/**
 * Request schema for POST /api/v1/enrich/company
 * Accepts either a Google Place ID or a Google Maps URL
 */
export const EnrichCompanyRequestSchema = z
  .object({
    googlePlaceId: z.string().optional(),
    googleMapsUrl: z.string().url().optional(),
  })
  .refine(
    (data) => {
      const hasPlaceId = !!data.googlePlaceId
      const hasMapsUrl = !!data.googleMapsUrl
      // Exactly one input method must be provided
      return (hasPlaceId && !hasMapsUrl) || (!hasPlaceId && hasMapsUrl)
    },
    {
      message: 'Provide exactly one of: googlePlaceId or googleMapsUrl',
    },
  )

export type EnrichCompanyRequest = z.infer<typeof EnrichCompanyRequestSchema>

// ============================================================================
// Enrichment Status Types
// ============================================================================

export interface EnrichmentStatusResponse {
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  step: string
  error?: string
  updatedAt: number
  jobId?: string
}

// ============================================================================
// WebSocket Types
// ============================================================================

/**
 * WebSocket error codes for enrichment namespace
 */
export type WebSocketErrorCode =
  | 'INVALID_UUID'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'RATE_LIMIT'

/**
 * Credit breakdown for contact enrichment
 * Sent with completed status updates
 */
export interface CreditsInfo {
  creditsUsed: number
  creditsBreakdown: {
    linkedin: number
    emails: number
    phones: number
  }
}

/**
 * Zod schemas for WebSocket event validation
 */
export const BatchSubscribeEventSchema = z.array(z.string().uuid())

export const WebSocketErrorSchema = z.object({
  message: z.string(),
  code: z.enum(['INVALID_UUID', 'NOT_FOUND', 'FORBIDDEN', 'RATE_LIMIT']),
  userPlaceId: z.string().uuid().optional(),
})

export const StatusUpdateEventSchema = z.object({
  userPlaceId: z.string().uuid(),
  status: z.enum(['idle', 'queued', 'processing', 'completed', 'failed']),
  step: z.string(),
  progress: z.number().min(0).max(100),
  updatedAt: z.number(),
  sequence: z.number(),
  error: z.string().optional(),
  jobId: z.string().optional(),
})

/**
 * Batch status update response - map of userPlaceId to status
 */
export type BatchStatusUpdate = Record<string, EnrichmentStatusResponse>

/**
 * Batch enrichment status response for multiple places
 */
export type BatchEnrichmentStatusResponse = Record<
  string,
  EnrichmentStatusResponse
>

/**
 * Type-safe WebSocket event definitions for enrichment namespace
 */
export interface EnrichmentWebSocketServerEvents {
  // Company enrichment status update
  'company-status-update': (
    data: {
      userPlaceId: string
      sequence: number
    } & EnrichmentStatusResponse,
  ) => void

  // Batch status update sent after batch-subscribe
  'batch-status-update': (data: BatchStatusUpdate) => void

  // Contact enrichment status update
  'contact-status-update': (data: {
    contactId: string
    sequence: number
    status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
    progress: number
    step: string
    error?: string
    updatedAt: number
    /** Credit info - only present on completed status */
    credits?: CreditsInfo
  }) => void

  // Officer enrichment status update
  'officer-status-update': (data: {
    officerId: string
    sequence: number
    status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
    progress: number
    step: string
    error?: string
    updatedAt: number
  }) => void

  error: (error: {
    message: string
    code: WebSocketErrorCode
    userPlaceId?: string
    contactId?: string
  }) => void
}

export interface EnrichmentWebSocketClientEvents {
  // Replaces all current subscriptions with the new set
  'batch-subscribe': (userPlaceIds: string[]) => void
}

// Type exports for Zod schemas
export type WebSocketError = z.infer<typeof WebSocketErrorSchema>
export type StatusUpdateEvent = z.infer<typeof StatusUpdateEventSchema>

// ============================================================================
// Enrichment Status Data (for UI)
// ============================================================================

export type EnrichmentStatusData = EnrichmentStatusResponse

// ============================================================================
// Enrichment Job Status API Response
// ============================================================================

export const EnrichmentJobStatusResponseSchema = z.object({
  status: z.enum(['idle', 'queued', 'processing', 'completed', 'failed']),
  progress: z.number(),
  step: z.string(),
  error: z.string().optional(),
  updatedAt: z.number(),
  jobId: z.string().optional(),
})

export const EnrichmentJobStatusApiResponseSchema = z.union([
  EnrichmentJobStatusResponseSchema,
  z.object({ error: z.string() }),
])

export type EnrichmentJobStatusResponse = z.infer<
  typeof EnrichmentJobStatusResponseSchema
>
export type EnrichmentJobStatusApiResponse = z.infer<
  typeof EnrichmentJobStatusApiResponseSchema
>
