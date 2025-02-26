import { z } from 'zod'
import { EnrichResponseSchema } from '../enrich'
import { NoteSchema } from './notes'

// Basic/Common Schemas
export const LocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
})

// Time-related Schemas
export const TimeSlotSchema = z.object({
  day: z.number(),
  hour: z.number(),
  minute: z.number(),
  date: z
    .object({
      year: z.number(),
      month: z.number(),
      day: z.number(),
    })
    .optional(),
})

export const PeriodSchema = z.object({
  open: TimeSlotSchema.optional(),
  close: TimeSlotSchema.optional(),
})

export const OpeningHoursSchema = z.object({
  openNow: z.boolean().optional(),
  periods: z.array(PeriodSchema).optional(),
  weekdayDescriptions: z.array(z.string()).optional(),
})

export const LocalizedTextSchema = z.object({
  text: z.string(),
  languageCode: z.string(),
})

export const AddressComponentSchema = z.object({
  longText: z.string(),
  shortText: z.string(),
  types: z.array(
    z.enum([
      'administrative_area_level_1',
      'administrative_area_level_2',
      'administrative_area_level_3',
      'administrative_area_level_4',
      'administrative_area_level_5',
      'administrative_area_level_6',
      'administrative_area_level_7',
      'archipelago',
      'colloquial_area',
      'continent',
      'establishment',
      'finance',
      'floor',
      'food',
      'general_contractor',
      'geocode',
      'health',
      'intersection',
      'landmark',
      'natural_feature',
      'neighborhood',
      'place_of_worship',
      'plus_code',
      'point_of_interest',
      'political',
      'post_box',
      'postal_code_prefix',
      'postal_code_suffix',
      'postal_town',
      'premise',
      'room',
      'route',
      'street_address',
      'street_number',
      'sublocality',
      'sublocality_level_1',
      'sublocality_level_2',
      'sublocality_level_3',
      'sublocality_level_4',
      'sublocality_level_5',
      'subpremise',
      'town_square',
      'country',
      'locality',
      'postal_code',
      'postal_town',
      'premise',
      'route',
      'street_address',
      'street_number',
      'sublocality',
      'plus_code',
    ]),
  ),
  languageCode: z.string(),
})

export const PriceLevelEnum = z.enum([
  'PRICE_LEVEL_FREE',
  'PRICE_LEVEL_INEXPENSIVE',
  'PRICE_LEVEL_MODERATE',
  'PRICE_LEVEL_EXPENSIVE',
  'PRICE_LEVEL_VERY_EXPENSIVE',
])

export const MoneySchema = z.object({
  currencyCode: z.string(),
  units: z.string(),
  nanos: z.number().optional(),
})
export const PriceRangeSchema = z.object({
  startPrice: MoneySchema.optional(),
  endPrice: MoneySchema.optional(),
})

// API Request/Response Schemas
export const PlacesSearchRequestBodySchema = z.object({
  textQuery: z.string().min(1),
  locationBias: z.object({
    circle: z.object({
      center: LocationSchema,
      radiusInMeters: z.number().positive(),
    }),
  }),
  model: z.enum(['DEFAULT', 'NAVIGATOR', 'EXPLORER', 'PRO']).default('DEFAULT'),
})

export const PlaceListAssociationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  emoji: z.string(),
})

export const PlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  website: z.string(),
  location: LocationSchema,
  types: z.array(z.string()),
  primaryType: z.string().optional(),
  priceLevel: PriceLevelEnum.optional(),
  priceRange: PriceRangeSchema.optional(),
  rating: z.number().optional(),
  ratingCount: z.number().optional(),
  utcOffsetMinutes: z.number(),
  openingHours: OpeningHoursSchema.optional(),
  googleMapsUri: z.string(),
  phone: z.string().optional(),
  addressComponents: z.array(AddressComponentSchema).optional(),
  address: z.object({
    formattedAddress: z.string().optional(),
    shortFormattedAddress: z.string().optional(),
    country: z.string().optional(),
    locality: z.string().optional(),
    sublocality: z.string().optional(),
    postalCode: z.string().optional(),
    postalCodeSuffix: z.string().optional(),
    plusCode: z.string().optional(),
    street: z.string().optional(),
    neighborhood: z.string().optional(),
    administrativeAreaLevel1: z.string().optional(),
    administrativeAreaLevel2: z.string().optional(),
    administrativeAreaLevel3: z.string().optional(),
  }),
  lists: z.array(PlaceListAssociationSchema).optional(),
  notes: z.array(NoteSchema).optional(),
  enrichment: EnrichResponseSchema.optional(),
})

// Type inference from schemas
export type Location = z.infer<typeof LocationSchema>
export type Place = z.infer<typeof PlaceSchema>
export type OpeningHours = z.infer<typeof OpeningHoursSchema>
export type PlacesSearchRequestBody = z.infer<
  typeof PlacesSearchRequestBodySchema
>
export type PlaceListAssociation = z.infer<typeof PlaceListAssociationSchema>
