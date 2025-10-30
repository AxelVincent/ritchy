import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const UpdateContactPhoneRequestSchema = z.object({
  contactId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
})

export const UpdateContactPhoneResponseSchema = z.object({
  success: z.boolean(),
})

export type UpdateContactPhoneRequest = z.infer<
  typeof UpdateContactPhoneRequestSchema
>

export type UpdateContactPhoneResponse = z.infer<
  typeof UpdateContactPhoneResponseSchema
>

export const UpdateContactPhoneApiResponseSchema = z.union([
  UpdateContactPhoneResponseSchema,
  ApiErrorResponseSchema,
])

export type UpdateContactPhoneApiResponse = z.infer<
  typeof UpdateContactPhoneApiResponseSchema
>
