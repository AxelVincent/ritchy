import { z } from 'zod'
import { PlaceSchema } from './places'

export const GetPlaceRequestParamsSchema = z.object({
  userPlaceId: z.string().uuid(),
})

export const GetPlaceApiResponseSchema = z.union([
  z.object({
    place: PlaceSchema,
  }),
  z.object({
    error: z.string(),
    message: z.string().optional(),
    details: z.array(z.any()).optional(),
  }),
])

export type GetPlaceRequestParams = z.infer<typeof GetPlaceRequestParamsSchema>
export type GetPlaceApiResponse = z.infer<typeof GetPlaceApiResponseSchema>
