import { z } from 'zod'

// Usage stats schema
export const ApiUsageStatsSchema = z.object({
  totalRequests: z.number(),
  requestsToday: z.number(),
  requestsThisMinute: z.number(),
  totalCreditsUsed: z.number(),
  creditsUsedToday: z.number(),
  creditsRemaining: z.number(),
})

// Response schema (success)
export const GetApiUsageResponseSchema = z.object({
  success: z.literal(true),
  data: ApiUsageStatsSchema,
})

// Error response schema
export const GetApiUsageErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

// API response (success | error)
export const GetApiUsageApiResponseSchema = z.union([
  GetApiUsageResponseSchema,
  GetApiUsageErrorResponseSchema,
])

// Inferred types
export type ApiUsageStats = z.infer<typeof ApiUsageStatsSchema>
export type GetApiUsageResponse = z.infer<typeof GetApiUsageResponseSchema>
export type GetApiUsageApiResponse = z.infer<
  typeof GetApiUsageApiResponseSchema
>
