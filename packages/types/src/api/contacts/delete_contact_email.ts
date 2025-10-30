import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const DeleteContactEmailRequestSchema = z.object({
  contactId: z.string().uuid(),
})

export const DeleteContactEmailResponseSchema = z.object({
  success: z.boolean(),
})

export type DeleteContactEmailRequest = z.infer<
  typeof DeleteContactEmailRequestSchema
>

export type DeleteContactEmailResponse = z.infer<
  typeof DeleteContactEmailResponseSchema
>

export const DeleteContactEmailApiResponseSchema = z.union([
  DeleteContactEmailResponseSchema,
  ApiErrorResponseSchema,
])

export type DeleteContactEmailApiResponse = z.infer<
  typeof DeleteContactEmailApiResponseSchema
>
