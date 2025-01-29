import { z } from 'zod'

const ContextSchema = z.object({
  id: z.string(),
  mapbox_id: z.string(),
  wikidata: z.string().optional(),
  short_code: z.string().optional(),
  text: z.string(),
})

const FeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.string(),
  place_type: z.array(z.string()),
  relevance: z.number(),
  properties: z.object({
    mapbox_id: z.string().optional(),
    wikidata: z.string().optional(),
  }),
  text: z.string(),
  place_name: z.string(),
  bbox: z.array(z.number()).optional(),
  center: z.array(z.number()),
  geometry: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
  context: z.array(ContextSchema).optional(),
  matching_text: z.string().optional(),
  matching_place_name: z.string().optional(),
})

export const MapboxGeocodeResponseSchema = z.object({
  type: z.literal('FeatureCollection'),
  query: z.array(z.string()).optional(),
  features: z.array(FeatureSchema),
  attribution: z.string(),
})

export type MapboxGeocodeResponse = z.infer<typeof MapboxGeocodeResponseSchema>

export type GeocodingResult = z.infer<typeof FeatureSchema>
