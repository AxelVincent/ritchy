import { z } from 'zod'

// API key list item schema
export const ApiKeyListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  prefix: z.string(),
  isActive: z.boolean(),
  lastUsedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
})

// Response schema (success)
export const ListApiKeysResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(ApiKeyListItemSchema),
})

// Error response schema
export const ListApiKeysErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

// API response (success | error)
export const ListApiKeysApiResponseSchema = z.union([
  ListApiKeysResponseSchema,
  ListApiKeysErrorResponseSchema,
])

// Inferred types
export type ApiKeyListItem = z.infer<typeof ApiKeyListItemSchema>
export type ListApiKeysResponse = z.infer<typeof ListApiKeysResponseSchema>
export type ListApiKeysApiResponse = z.infer<
  typeof ListApiKeysApiResponseSchema
>
