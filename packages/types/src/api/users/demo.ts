import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const ValidateDemoCodeRequestSchema = z.object({
  code: z.string().min(1, { message: 'Code cannot be empty' }),
})
export type ValidateDemoCodeRequest = z.infer<
  typeof ValidateDemoCodeRequestSchema
>

export const ValidateDemoCodeSuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
})

export const ValidateDemoCodeApiResponseSchema = z.union([
  ValidateDemoCodeSuccessResponseSchema,
  ApiErrorResponseSchema,
])
export type ValidateDemoCodeApiResponse = z.infer<
  typeof ValidateDemoCodeApiResponseSchema
>
