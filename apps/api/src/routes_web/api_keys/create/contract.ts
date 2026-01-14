import { z } from 'zod'

// Request schema
export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(100),
})

// Response schema (success)
export const CreateApiKeyResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string().uuid(),
    key: z.string(), // Full key - shown only once
    name: z.string(),
  }),
})

// Error response schema
export const CreateApiKeyErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
})

// API response (success | error)
export const CreateApiKeyApiResponseSchema = z.union([
  CreateApiKeyResponseSchema,
  CreateApiKeyErrorResponseSchema,
])

// Inferred types
export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>
export type CreateApiKeyResponse = z.infer<typeof CreateApiKeyResponseSchema>
export type CreateApiKeyApiResponse = z.infer<
  typeof CreateApiKeyApiResponseSchema
>
