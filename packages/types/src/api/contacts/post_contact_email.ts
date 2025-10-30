import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const PostContactEmailRequestSchema = z.object({
  contactId: z.string().uuid(),
  email: z.string().email(),
})

export const PostContactEmailResponseSchema = z.object({
  id: z.string().uuid(),
})

export type PostContactEmailRequest = z.infer<
  typeof PostContactEmailRequestSchema
>

export type PostContactEmailResponse = z.infer<
  typeof PostContactEmailResponseSchema
>

export const PostContactEmailApiResponseSchema = z.union([
  PostContactEmailResponseSchema,
  ApiErrorResponseSchema,
])

export type PostContactEmailApiResponse = z.infer<
  typeof PostContactEmailApiResponseSchema
>
