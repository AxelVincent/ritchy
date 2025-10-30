import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const DeleteContactRequestSchema = z.object({
  placeId: z.string().uuid(),
})

export const DeleteContactParamsSchema = z.object({
  contactId: z.string().uuid(),
})

export const DeleteContactResponseSchema = z.object({
  success: z.boolean(),
  contactId: z.string().uuid(),
})

export const DeleteContactApiResponseSchema = z.union([
  DeleteContactResponseSchema,
  ApiErrorResponseSchema,
])

export type DeleteContactRequest = z.infer<typeof DeleteContactRequestSchema>
export type DeleteContactParams = z.infer<typeof DeleteContactParamsSchema>
export type DeleteContactResponse = z.infer<typeof DeleteContactResponseSchema>
export type DeleteContactApiResponse = z.infer<
  typeof DeleteContactApiResponseSchema
>
