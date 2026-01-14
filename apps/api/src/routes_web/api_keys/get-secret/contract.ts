import { z } from 'zod'

// Params schema
export const GetApiKeySecretParamsSchema = z.object({
  id: z.string().uuid(),
})

// Response schema (success)
export const GetApiKeySecretResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    key: z.string(),
  }),
})

// Error response schema
export const GetApiKeySecretErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

// API response (success | error)
export const GetApiKeySecretApiResponseSchema = z.union([
  GetApiKeySecretResponseSchema,
  GetApiKeySecretErrorResponseSchema,
])

// Inferred types
export type GetApiKeySecretParams = z.infer<typeof GetApiKeySecretParamsSchema>
export type GetApiKeySecretResponse = z.infer<
  typeof GetApiKeySecretResponseSchema
>
export type GetApiKeySecretApiResponse = z.infer<
  typeof GetApiKeySecretApiResponseSchema
>
