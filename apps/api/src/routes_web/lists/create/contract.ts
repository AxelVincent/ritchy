import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Request schema
export const CreateListRequestSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  emoji: z.string().min(1),
})

// Response schema (success)
export const CreateListResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  emoji: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// API response (success | error)
export const CreateListApiResponseSchema = z.union([
  CreateListResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type CreateListRequest = z.infer<typeof CreateListRequestSchema>
export type CreateListResponse = z.infer<typeof CreateListResponseSchema>
export type CreateListApiResponse = z.infer<typeof CreateListApiResponseSchema>
