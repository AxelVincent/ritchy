import { z } from 'zod'
import {
  ApiErrorResponseSchema,
  CoordinateSchema,
  RectangleSchema,
} from './common'

// Autocomplete schemas
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

// Geocode schemas
export const GeocodeRequestParamsSchema = z.object({
  placeId: z.string().min(1),
})

export const GeocodeAddressComponentSchema = z.object({
  long_name: z.string(),
  short_name: z.string(),
  types: z.array(z.string()),
})

export const GeometryLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

export const GeometrySchema = z.object({
  location: GeometryLocationSchema,
  location_type: z.string(),
  viewport: z.object({
    northeast: GeometryLocationSchema,
    southwest: GeometryLocationSchema,
  }),
})

export type Geometry = z.infer<typeof GeometrySchema>

export const GeocodeLocationSchema = z.object({
  formatted_address: z.string(),
  geometry: GeometrySchema,
  place_id: z.string(),
})

export type GeocodeLocation = z.infer<typeof GeocodeLocationSchema>

export const GeocodeResultSchema = z.union([
  GeocodeLocationSchema,
  z.object({
    address_components: z.array(GeocodeAddressComponentSchema),
    place_id: z.string(),
    types: z.array(z.string()),
  }),
])

export const GeocodeResponseSchema = z.object({
  result: GeocodeResultSchema,
})

export const GeocodeApiResponseSchema = z.union([
  GeocodeResponseSchema,
  ApiErrorResponseSchema,
])

export type GeocodeRequestParams = z.infer<typeof GeocodeRequestParamsSchema>
export type GeocodeResult = z.infer<typeof GeocodeResultSchema>
export type GeocodeResponse = z.infer<typeof GeocodeResponseSchema>
export type GeocodeApiResponse = z.infer<typeof GeocodeApiResponseSchema>
