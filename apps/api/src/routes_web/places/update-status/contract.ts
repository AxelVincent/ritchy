import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Status enum
export const StatusEnum = z.enum([
  'NEW',
  'NO_ANSWER',
  'CONTACTED',
  'FOLLOW_UP',
  'MEETING',
  'INTERESTED',
  'WON',
  'LOST',
])

// Params schema
export const UpdateStatusParamsSchema = z.object({
  userPlaceId: z.string(),
})

// Body schema
export const UpdateStatusBodySchema = z.object({
  status: StatusEnum,
})

// Response schema (success)
export const StatusResponseSchema = z.object({
  status: StatusEnum,
  createdAt: z.string(),
  updatedAt: z.string(),
})

// API response (success | error)
export const UpdateStatusApiResponseSchema = z.union([
  StatusResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type StatusType = z.infer<typeof StatusEnum>
export type UpdateStatusParams = z.infer<typeof UpdateStatusParamsSchema>
export type UpdateStatusBody = z.infer<typeof UpdateStatusBodySchema>
export type StatusResponse = z.infer<typeof StatusResponseSchema>
export type UpdateStatusApiResponse = z.infer<
  typeof UpdateStatusApiResponseSchema
>
