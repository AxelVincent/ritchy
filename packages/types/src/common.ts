import { z } from 'zod'

export const ApiErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        path: z.array(z.string().or(z.number())),
      }),
    )
    .optional(),
})

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>

export const CoordinateSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
})

export const RectangleSchema = z.object({
  northEast: CoordinateSchema,
  southWest: CoordinateSchema,
})

export type Coordinate = z.infer<typeof CoordinateSchema>
export type Rectangle = z.infer<typeof RectangleSchema>
