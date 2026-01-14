import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Plan enum
export const PlanEnum = z.enum(['FREE', 'ESSENTIALS', 'PRO', 'ENTERPRISE'])

// Search model enum
export const SearchModelEnum = z.enum([
  'BASIC',
  'ENHANCED',
  'ADVANCED',
  'EXPERT',
])
export type SearchModel = z.infer<typeof SearchModelEnum>

// Request schema
export const CreateCheckoutSessionRequestSchema = z.object({
  plan: PlanEnum,
  billingInterval: z.enum(['monthly', 'quarterly', 'yearly']),
  currency: z.enum(['usd', 'eur']),
})

// Response schema (success)
export const CreateCheckoutSessionResponseSchema = z.object({
  clientSecret: z.string().nullable(),
  portalUrl: z.string().nullable(),
})

// API response (success | error)
export const CreateCheckoutSessionApiResponseSchema = z.union([
  CreateCheckoutSessionResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type Plan = z.infer<typeof PlanEnum>
export type CreateCheckoutSessionRequest = z.infer<
  typeof CreateCheckoutSessionRequestSchema
>
export type CreateCheckoutSessionResponse = z.infer<
  typeof CreateCheckoutSessionResponseSchema
>
export type CreateCheckoutSessionApiResponse = z.infer<
  typeof CreateCheckoutSessionApiResponseSchema
>
