import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const DeleteContactPhoneRequestSchema = z.object({
  contactId: z.string().uuid(),
})

export const DeleteContactPhoneResponseSchema = z.object({
  success: z.boolean(),
})

export type DeleteContactPhoneRequest = z.infer<
  typeof DeleteContactPhoneRequestSchema
>

export type DeleteContactPhoneResponse = z.infer<
  typeof DeleteContactPhoneResponseSchema
>

export const DeleteContactPhoneApiResponseSchema = z.union([
  DeleteContactPhoneResponseSchema,
  ApiErrorResponseSchema,
])

export type DeleteContactPhoneApiResponse = z.infer<
  typeof DeleteContactPhoneApiResponseSchema
>
