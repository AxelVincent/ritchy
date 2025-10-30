import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const UpdateContactEmailRequestSchema = z.object({
  contactId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
})

export const UpdateContactEmailResponseSchema = z.object({
  success: z.boolean(),
})

export type UpdateContactEmailRequest = z.infer<
  typeof UpdateContactEmailRequestSchema
>

export type UpdateContactEmailResponse = z.infer<
  typeof UpdateContactEmailResponseSchema
>

export const UpdateContactEmailApiResponseSchema = z.union([
  UpdateContactEmailResponseSchema,
  ApiErrorResponseSchema,
])

export type UpdateContactEmailApiResponse = z.infer<
  typeof UpdateContactEmailApiResponseSchema
>
