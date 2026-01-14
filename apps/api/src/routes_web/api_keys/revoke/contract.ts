import { z } from 'zod'

// Params schema
export const RevokeApiKeyParamsSchema = z.object({
  id: z.string().uuid(),
})

// Response schema (success)
export const RevokeApiKeyResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string().uuid(),
  }),
})

// Error response schema
export const RevokeApiKeyErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
})

// API response (success | error)
export const RevokeApiKeyApiResponseSchema = z.union([
  RevokeApiKeyResponseSchema,
  RevokeApiKeyErrorResponseSchema,
])

// Inferred types
export type RevokeApiKeyParams = z.infer<typeof RevokeApiKeyParamsSchema>
export type RevokeApiKeyResponse = z.infer<typeof RevokeApiKeyResponseSchema>
export type RevokeApiKeyApiResponse = z.infer<
  typeof RevokeApiKeyApiResponseSchema
>
