import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const StatusEnum = z.enum([
  'NEW',
  'NO_ANSWER',
  'CONTACTED',
  'FOLLOW_UP',
  'MEETING',
  'IN_PROGRESS',
  'WON',
  'LOST',
])

export const StatusSchema = z.object({
  status: StatusEnum,
  createdAt: z.string(),
  updatedAt: z.string(),
})

// Request Schemas
export const UpdateStatusRequestSchema = z.object({
  placeId: z.string(),
  status: StatusEnum,
})

// Response Schemas with Error Handling
export const UpdateStatusApiResponseSchema = z.union([
  StatusSchema,
  ApiErrorResponseSchema,
])

export type Status = z.infer<typeof StatusSchema>
export type StatusType = z.infer<typeof StatusEnum>
export type UpdateStatusRequest = z.infer<typeof UpdateStatusRequestSchema>
export type UpdateStatusApiResponse = z.infer<
  typeof UpdateStatusApiResponseSchema
>
