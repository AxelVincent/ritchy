import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

// Schema for the request
export const syncPlaceBodySchema = z.object({
  userPlaceIds: z.array(z.string()),
})

// Schema for the response
export const syncPlaceResponseSchema = z.object({
  success: z.boolean(),
  companyIds: z.array(z.string()),
  error: z.string().optional(),
})

export const syncPlaceApiResponseSchema = z.union([
  syncPlaceResponseSchema,
  ApiErrorResponseSchema,
])

export type SyncPlaceBody = z.infer<typeof syncPlaceBodySchema>
export type SyncPlaceResponse = z.infer<typeof syncPlaceResponseSchema>
export type SyncPlaceApiResponse = z.infer<typeof syncPlaceApiResponseSchema>
