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
import { UrlSchema } from '../schemas'

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

export const SocialMediaPlatformEnum = z.enum([
  'linkedin',
  'twitter',
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'pinterest',
  'reddit',
  'snapchat',
])

// Domain registration data schema
export const DomainRegistrationSchema = z.object({
  registrationDate: z.string().nullable(),
  lastUpdated: z.string(),
})

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

export const EnrichmentJobStatusParamsSchema = z.object({
  jobId: z.string(),
})

export const EnrichmentJobStatusSchema = z.object({
  status: z.enum(['processing', 'completed', 'error']),
  progress: z.number().min(0).max(100),
  data: z.object({
    jobId: z.string(),
    totalMessages: z.number().positive(),
    processedMessages: z.number().min(0),
    remainingMessages: z.number().min(0),
    startedAt: z.string(),
    completedAt: z.string().optional(),
    errors: z.array(z.string()),
  }),
})

export const EnrichmentJobStatusApiResponseSchema = z.union([
  EnrichmentJobStatusSchema,
  ApiErrorResponseSchema,
])

// Type inference from schemas
export type EnrichRequestQuery = z.infer<typeof EnrichRequestSchema>
export type EnrichResponse = z.infer<typeof EnrichResponseSchema>
export type EnrichApiResponse = z.infer<typeof EnrichApiResponseSchema>
export type DomainRegistration = z.infer<typeof DomainRegistrationSchema>
export type EnrichmentJobStatus = z.infer<typeof EnrichmentJobStatusSchema>
export type EnrichmentJobStatusParams = z.infer<
  typeof EnrichmentJobStatusParamsSchema
>
export type EnrichmentJobStatusApiResponse = z.infer<
  typeof EnrichmentJobStatusApiResponseSchema
>

// Add type for the config
export type SocialMediaPlatform = keyof typeof SOCIAL_MEDIA_CONFIG
export type SocialMediaConfig =
  (typeof SOCIAL_MEDIA_CONFIG)[SocialMediaPlatform]

// Batch Enrichment Schemas
export const EnrichmentJobSchema = z.object({
  userId: z.string().uuid(),
  enrichments: z
    .array(
      z.object({
        placeId: z.string(),
        website: UrlSchema,
      }),
    )
    .min(1)
    .max(500), // Limit batch size
})

export const EnrichmentJobResultSchema = z.object({
  placeId: z.string(),
  success: z.boolean(),
  data: EnrichResponseSchema.optional(),
  error: z.string().optional(),
  warning: z.string().optional(),
})

export const EnrichmentProgressSchema = z.object({
  jobId: z.string(),
  placeId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  error: z.string().optional(),
})

export const BatchEnrichmentRequestBodySchema = z.object({
  enrichments: z
    .array(
      z.object({
        placeId: z.string(),
        website: UrlSchema,
      }),
    )
    .min(1)
    .max(500),
})

export const BatchEnrichmentResponseSchema = z.object({
  jobId: z.string(),
  message: z.string(),
  enrichmentCount: z.number().positive(),
})

export const BatchEnrichmentResponseApiResponseSchema = z.union([
  BatchEnrichmentResponseSchema,
  ApiErrorResponseSchema,
])

export const EnrichmentCompleteSchema = z.object({
  jobId: z.string(),
  results: z.array(EnrichmentJobResultSchema),
})

// WebSocket Event Type Constants
export const WEBSOCKET_EVENT_TYPES = {
  // Server → Client Events
  ENRICHMENT_STARTED: 'enrichment:started',
  ENRICHMENT_PROGRESS: 'enrichment:progress',
  ENRICHMENT_COMPLETE: 'enrichment:complete',
  ENRICHMENT_ERROR: 'enrichment:error',

  // Client → Server Events
  ENRICHMENT_SUBSCRIBE: 'enrichment:subscribe',
  ENRICHMENT_UNSUBSCRIBE: 'enrichment:unsubscribe',

  // Connection Events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Test Events
  PING: 'ping',
  PONG: 'pong',
  TEST: 'test',
} as const

// WebSocket Event Status Constants
export const ENRICHMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

// Enhanced WebSocket Event Schemas (using constants)
export const WebSocketEnrichmentStartedSchema = z.object({
  type: z.literal(WEBSOCKET_EVENT_TYPES.ENRICHMENT_STARTED),
  payload: z.object({
    jobId: z.string(),
    totalPlaces: z.number().positive(),
    batchInfo: z.object({
      batchSize: z.number().positive(),
      totalBatches: z.number().positive(),
      currentBatch: z.number().positive(),
    }),
  }),
})

export const WebSocketEnrichmentProgressSchema = z.object({
  type: z.literal(WEBSOCKET_EVENT_TYPES.ENRICHMENT_PROGRESS),
  payload: z.object({
    jobId: z.string(),
    placeId: z.string(),
    status: z.enum([
      ENRICHMENT_STATUS.PENDING,
      ENRICHMENT_STATUS.PROCESSING,
      ENRICHMENT_STATUS.COMPLETED,
      ENRICHMENT_STATUS.FAILED,
    ]),
    progress: z.object({
      current: z.number().min(0),
      total: z.number().positive(),
    }),
    data: EnrichResponseSchema.optional(),
    error: z.string().optional(),
  }),
})

export const WebSocketEnrichmentCompleteSchema = z.object({
  type: z.literal(WEBSOCKET_EVENT_TYPES.ENRICHMENT_COMPLETE),
  payload: z.object({
    jobId: z.string(),
    totalProcessed: z.number().min(0),
    results: z.array(EnrichmentJobResultSchema),
    summary: z.object({
      successful: z.number().min(0),
      failed: z.number().min(0),
      totalEmails: z.number().min(0),
      totalSocialLinks: z.number().min(0),
    }),
  }),
})

export const WebSocketEnrichmentErrorSchema = z.object({
  type: z.literal(WEBSOCKET_EVENT_TYPES.ENRICHMENT_ERROR),
  payload: z.object({
    jobId: z.string(),
    placeId: z.string().optional(),
    error: z.string(),
    timestamp: z.string(),
  }),
})

export const WebSocketEventSchema = z.union([
  WebSocketEnrichmentStartedSchema,
  WebSocketEnrichmentProgressSchema,
  WebSocketEnrichmentCompleteSchema,
  WebSocketEnrichmentErrorSchema,
])

// Client → Server Event Schemas (using constants)
export const WebSocketEnrichmentSubscribeSchema = z.object({
  type: z.literal(WEBSOCKET_EVENT_TYPES.ENRICHMENT_SUBSCRIBE),
  payload: z.object({
    jobId: z.string(),
  }),
})

export const WebSocketEnrichmentUnsubscribeSchema = z.object({
  type: z.literal(WEBSOCKET_EVENT_TYPES.ENRICHMENT_UNSUBSCRIBE),
  payload: z.object({
    jobId: z.string(),
  }),
})

export const WebSocketClientEventSchema = z.union([
  WebSocketEnrichmentSubscribeSchema,
  WebSocketEnrichmentUnsubscribeSchema,
])

// Type inference from schemas
export type EnrichmentJob = z.infer<typeof EnrichmentJobSchema>
export type EnrichmentJobResult = z.infer<typeof EnrichmentJobResultSchema>
export type EnrichmentProgress = z.infer<typeof EnrichmentProgressSchema>
export type BatchEnrichmentRequestBody = z.infer<
  typeof BatchEnrichmentRequestBodySchema
>
export type BatchEnrichmentResponse = z.infer<
  typeof BatchEnrichmentResponseSchema
>
export type BatchEnrichmentResponseApiResponse = z.infer<
  typeof BatchEnrichmentResponseApiResponseSchema
>
export type EnrichmentComplete = z.infer<typeof EnrichmentCompleteSchema>
export type WebSocketEnrichmentStarted = z.infer<
  typeof WebSocketEnrichmentStartedSchema
>
export type WebSocketEnrichmentProgress = z.infer<
  typeof WebSocketEnrichmentProgressSchema
>
export type WebSocketEnrichmentComplete = z.infer<
  typeof WebSocketEnrichmentCompleteSchema
>
export type WebSocketEnrichmentError = z.infer<
  typeof WebSocketEnrichmentErrorSchema
>
export type WebSocketEvent = z.infer<typeof WebSocketEventSchema>
export type WebSocketClientEvent = z.infer<typeof WebSocketClientEventSchema>

// Additional type exports for constants
export type WebSocketEventType =
  (typeof WEBSOCKET_EVENT_TYPES)[keyof typeof WEBSOCKET_EVENT_TYPES]
export type EnrichmentStatus =
  (typeof ENRICHMENT_STATUS)[keyof typeof ENRICHMENT_STATUS]
