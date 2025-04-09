import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'
import { CoordinateSchema, RectangleSchema } from '../searches/search'

export const AutocompleteRequestBodySchema = z.object({
  input: z.string().min(1),
  locationBias: z
    .object({
      circle: z.object({
        center: CoordinateSchema,
        radius: z.number().min(0).max(50000),
      }),
    })
    .or(
      z.object({
        rectangle: RectangleSchema,
      }),
    )
    .optional(),
  sessionToken: z.string().optional(),
  languageCode: z.string().optional(),
  includedPrimaryTypes: z.array(z.string()).max(5).optional(),
  origin: CoordinateSchema.optional(),
})

export const AutocompletePredictionSchema = z.object({
  placeId: z.string(),
  text: z.string(),
  mainText: z.string(),
  secondaryText: z.string().optional(),
  types: z.array(z.string()),
})

export const AutocompleteResponseSchema = z.object({
  predictions: z.array(AutocompletePredictionSchema),
})

export const AutocompleteApiResponseSchema = z.union([
  AutocompleteResponseSchema,
  ApiErrorResponseSchema,
])

export type AutocompleteRequestBody = z.infer<
  typeof AutocompleteRequestBodySchema
>
export type AutocompletePrediction = z.infer<
  typeof AutocompletePredictionSchema
>
export type AutocompleteResponse = z.infer<typeof AutocompleteResponseSchema>
export type AutocompleteApiResponse = z.infer<
  typeof AutocompleteApiResponseSchema
>
