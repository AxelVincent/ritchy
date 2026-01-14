import { z } from 'zod'

// ============================================================================
// API Key Types
// ============================================================================

/**
 * Request schema for creating an API key
 */
export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(100),
})

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>

/**
 * API key data returned after creation (includes full key once)
 */
export const CreatedApiKeySchema = z.object({
  id: z.string().uuid(),
  key: z.string(), // Full key - shown only once
  prefix: z.string(), // e.g., "rk_..."
  name: z.string(),
})

export type CreatedApiKey = z.infer<typeof CreatedApiKeySchema>

/**
 * API key list item (without the full key)
 */
export const ApiKeyListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  prefix: z.string(),
  isActive: z.boolean(),
  lastUsedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
})

export type ApiKeyListItem = z.infer<typeof ApiKeyListItemSchema>

/**
 * API usage statistics
 */
export const ApiUsageStatsSchema = z.object({
  totalRequests: z.number(),
  requestsToday: z.number(),
  requestsThisMinute: z.number(),
  totalCreditsUsed: z.number(),
  creditsUsedToday: z.number(),
  creditsRemaining: z.number(),
})

export type ApiUsageStats = z.infer<typeof ApiUsageStatsSchema>
