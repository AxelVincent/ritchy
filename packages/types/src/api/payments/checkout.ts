import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const PlanEnum = z.enum(['FREE', 'ESSENTIALS', 'PRO', 'ENTERPRISE'])

export const SearchModelEnum = z.enum([
  'BASIC',
  'ENHANCED',
  'ADVANCED',
  'EXPERT',
])
export type SearchModel = z.infer<typeof SearchModelEnum>

export const CreateCheckoutSessionRequestBodySchema = z.object({
  plan: PlanEnum,
  billingInterval: z.enum(['monthly', 'quarterly', 'yearly']),
  currency: z.enum(['usd', 'eur']),
})

export const CreateCheckoutSessionResponseSchema = z.object({
  clientSecret: z.string().nullable(),
  portalUrl: z.string().nullable(),
})

export const CreateCheckoutSessionApiResponseSchema = z.union([
  CreateCheckoutSessionResponseSchema,
  ApiErrorResponseSchema,
])

export type Plan = z.infer<typeof PlanEnum>

export type CreateCheckoutSessionRequestBody = z.infer<
  typeof CreateCheckoutSessionRequestBodySchema
>
export type CreateCheckoutSessionResponse = z.infer<
  typeof CreateCheckoutSessionResponseSchema
>
export type CreateCheckoutSessionApiResponse = z.infer<
  typeof CreateCheckoutSessionApiResponseSchema
>
