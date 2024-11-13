import { z } from 'zod'
import { ApiErrorResponseSchema } from '../common'

// Basic/Common Schemas
export const LocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number()
})

// API Request/Response Schemas
export const PlacesSearchRequestBodySchema = z.object({
  textQuery: z.string().min(1),
  locationBias: z.object({
    circle: z.object({
      center: LocationSchema,
      radiusInMeters: z.number().positive()
    })
  }),
  resultsQuantity: z.number().positive()
})

export const PlaceSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  websiteUri: z.string().optional(),
  location: LocationSchema,
  types: z.array(z.string()),
  rating: z.number().optional(),
  userRatingCount: z.number().optional(),
  formattedAddress: z.string(),
  shortFormattedAddress: z.string().optional(),
  currentOpeningHours: z
    .object({
      openNow: z.boolean(),
      periods: z.array(
        z.object({
          open: z.object({
            time: z.string()
          })
        })
      )
    })
    .optional(),
  googleMapsUri: z.string().optional()
})

export const PlacesSearchResponseSchema = z.array(PlaceSchema)

export const PlacesSearchApiResponseSchema = z.union([
  PlacesSearchResponseSchema,
  ApiErrorResponseSchema
])

// Type inference from schemas
export type Location = z.infer<typeof LocationSchema>
export type Place = z.infer<typeof PlaceSchema>
export type PlacesSearchRequestBody = z.infer<
  typeof PlacesSearchRequestBodySchema
>
export type PlacesSearchResponse = z.infer<typeof PlacesSearchResponseSchema>
export type PlacesSearchApiResponse = z.infer<
  typeof PlacesSearchApiResponseSchema
>
