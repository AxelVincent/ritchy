import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const UpdateContactRequestSchema = z.object({
  isPrimary: z.boolean(),
})

export const UpdateContactResponseSchema = z.object({
  success: z.boolean(),
})

export type UpdateContactRequest = z.infer<typeof UpdateContactRequestSchema>

export type UpdateContactResponse = z.infer<typeof UpdateContactResponseSchema>

export const UpdateContactApiResponseSchema = z.union([
  UpdateContactResponseSchema,
  ApiErrorResponseSchema,
])

export type UpdateContactApiResponse = z.infer<
  typeof UpdateContactApiResponseSchema
>
