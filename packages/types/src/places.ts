import { z } from 'zod'

// Base schemas
export const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number()
})

export const PlaceResultSchema = z.object({
  business_status: z.string(),
  formatted_address: z.string(),
  geometry: z.object({
    location: LocationSchema,
    viewport: z.object({
      northeast: LocationSchema,
      southwest: LocationSchema
    })
  }),
  icon: z.string(),
  icon_background_color: z.string(),
  icon_mask_base_uri: z.string(),
  name: z.string(),
  opening_hours: z
    .object({
      open_now: z.boolean()
    })
    .optional(),
  photos: z
    .array(
      z.object({
        height: z.number(),
        html_attributions: z.array(z.string()),
        photo_reference: z.string(),
        width: z.number()
      })
    )
    .optional(),
  place_id: z.string(),
  plus_code: z.object({
    compound_code: z.string(),
    global_code: z.string()
  }),
  price_level: z.number().optional(),
  rating: z.number().optional(),
  reference: z.string(),
  types: z.array(z.string()),
  user_ratings_total: z.number().optional()
})

export const PlacesApiResponseSchema = z.object({
  html_attributions: z.array(z.string()),
  next_page_token: z.string(),
  results: z.array(PlaceResultSchema),
  status: z.string()
})

export const SearchRequestBodySchema = z.object({
  query: z.string().min(1),
  center: LocationSchema,
  radius: z.number().positive(),
  pageToken: z.string().optional()
})

export const SearchResponseSchema = PlaceResultSchema.array()

// Type inference from schemas
export type SearchRequestBody = z.infer<typeof SearchRequestBodySchema>
export type SearchResponse = z.infer<typeof SearchResponseSchema>
export type PlaceResult = z.infer<typeof PlaceResultSchema>
