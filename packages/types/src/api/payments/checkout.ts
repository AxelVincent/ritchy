import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const CreateCheckoutSessionRequestBodySchema = z.object({
  plan: z.enum(['FREE', 'EXPLORER', 'NAVIGATOR', 'PRO']),
})

export const CreateCheckoutSessionResponseSchema = z.object({
  clientSecret: z.string().nullable(),
  portalUrl: z.string().nullable(),
})

export const CreateCheckoutSessionApiResponseSchema = z.union([
  CreateCheckoutSessionResponseSchema,
  ApiErrorResponseSchema,
])

export type CreateCheckoutSessionRequestBody = z.infer<
  typeof CreateCheckoutSessionRequestBodySchema
>
export type CreateCheckoutSessionResponse = z.infer<
  typeof CreateCheckoutSessionResponseSchema
>
export type CreateCheckoutSessionApiResponse = z.infer<
  typeof CreateCheckoutSessionApiResponseSchema
>
