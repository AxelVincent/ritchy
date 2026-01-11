import { z } from 'zod'
import { ApiErrorResponseSchema, RectangleSchema } from './common'
import {
  EmailQualityEnum,
  EmailResultEnum,
  EnrichedStatusEnum,
  PhoneTypeEnum,
  PriceLevelEnum,
  SearchModelEnum,
  SocialMediaPlatformEnum,
  StatusEnum,
} from './enums'

// Location schema
export const LocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
})
export type Location = z.infer<typeof LocationSchema>

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
export type OpeningHours = z.infer<typeof OpeningHoursSchema>

export const LocalizedTextSchema = z.object({
  text: z.string().optional(),
  languageCode: z.string().optional(),
})
export type LocalizedText = z.infer<typeof LocalizedTextSchema>

export const AddressComponentSchema = z.object({
  longText: z.string().optional(),
  shortText: z.string().optional(),
  types: z
    .array(
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
        'beach',
      ]),
    )
    .optional(),
  languageCode: z.string().optional(),
})
export type AddressComponent = z.infer<typeof AddressComponentSchema>

export const MoneySchema = z.object({
  currencyCode: z.string(),
  units: z.string().optional(),
  nanos: z.number().optional(),
})
export type Money = z.infer<typeof MoneySchema>

export const PriceRangeSchema = z.object({
  startPrice: MoneySchema.optional(),
  endPrice: MoneySchema.optional(),
})
export type PriceRange = z.infer<typeof PriceRangeSchema>

// Note schema
export const NoteSchema = z.object({
  id: z.string().uuid(),
  userPlaceId: z.string(),
  note: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Note = z.infer<typeof NoteSchema>

// Email schema
export const EmailSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  isPrimary: z.boolean(),
  contactId: z.string(),
  source: z.string().nullable().optional(),
  isVerified: z.boolean(),
  quality: EmailQualityEnum.nullable().optional(),
  result: EmailResultEnum.nullable().optional(),
  role: z.boolean().nullable().optional(),
  free: z.boolean().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Email = z.infer<typeof EmailSchema>

// Phone schema
export const PhoneSchema = z.object({
  id: z.string().optional(),
  phone: z.string(),
  type: PhoneTypeEnum.optional(),
  contactId: z.string().optional(),
  contactName: z.string().optional(),
  isPrimary: z.boolean().optional(),
  createdAt: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .optional(),
  updatedAt: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .optional(),
})
export type Phone = z.infer<typeof PhoneSchema>

// Social media schema
export const SocialMediaSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  socialMediaPlatform: SocialMediaPlatformEnum.optional(),
  isPrimary: z.boolean().optional(),
  contactId: z.string().optional(),
  contactName: z.string().optional(),
  createdAt: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .optional(),
  updatedAt: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .optional(),
})
export type SocialMedia = z.infer<typeof SocialMediaSchema>

// Company activity schema
export const CompanyActivitySchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  name: z.string().nullable(),
  type: z.string(),
})
export type CompanyActivity = z.infer<typeof CompanyActivitySchema>

// Place contact schema
export const PlaceContactSchema = z.object({
  id: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  role: z.string().nullable(),
  type: z.string().nullable(),
})
export type PlaceContact = z.infer<typeof PlaceContactSchema>

// Place list association schema
export const PlaceListAssociationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  emoji: z.string(),
})
export type PlaceListAssociation = z.infer<typeof PlaceListAssociationSchema>

// Places search request body
export const PlacesSearchRequestBodySchema = z.object({
  textQuery: z.string().min(1),
  rectangle: RectangleSchema,
  model: SearchModelEnum.default('BASIC'),
})
export type PlacesSearchRequestBody = z.infer<
  typeof PlacesSearchRequestBodySchema
>

// Base place schema (without extended fields)
export const PlaceSchemaBase = z.object({
  id: z.string().uuid(),
  sourceId: z.string(),
  source: z.string(),
  sourceUrl: z.string().nullable(),
  name: z.string(),
  website: z.string().optional(),
  location: LocationSchema,
  types: z.array(z.string()),
  primaryType: z.string().optional(),
  priceLevel: PriceLevelEnum.optional(),
  priceRange: PriceRangeSchema.optional(),
  rating: z.number().optional(),
  ratingCount: z.number().optional(),
  utcOffsetMinutes: z.number(),
  openingHours: OpeningHoursSchema.optional(),
  phone: z.string().optional(),
  isDeleted: z.boolean(),
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
    streetNumber: z.string().optional(),
    neighborhood: z.string().optional(),
    administrativeAreaLevel1: z.string().optional(),
    administrativeAreaLevel2: z.string().optional(),
    administrativeAreaLevel3: z.string().optional(),
  }),
})
export type PlaceBase = z.infer<typeof PlaceSchemaBase>

// Full place schema
export const PlaceSchema = PlaceSchemaBase.extend({
  listId: z.string().uuid().nullable(),
  lists: z.array(PlaceListAssociationSchema).optional(),
  notes: z.array(NoteSchema).optional().nullable(),
  status: StatusEnum.nullable(),
  createdAt: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val)),
  lastInteractionAt: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .nullable(),
  domainRegisteredAt: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .nullable(),
  shortDescription: z.string().nullable(),
  enrichmentDomain: z.string().nullable().optional(),
  semanticRelevanceScore: z.number().min(0).max(1).optional(),
  contactEmails: z.array(EmailSchema).optional(),
  contactPhones: z.array(PhoneSchema).optional(),
  contactLinkedins: z.array(SocialMediaSchema).optional(),
  contactFacebooks: z.array(SocialMediaSchema).optional(),
  contactInstagrams: z.array(SocialMediaSchema).optional(),
  enrichedStatus: EnrichedStatusEnum.nullable(),
  companyWorkforceRange: z.string().nullable(),
  companyDateOfCreation: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .nullable(),
  companyActivities: z.array(CompanyActivitySchema),
  placeContacts: z.array(PlaceContactSchema),
  companyTechnologies: z.array(z.string()),
})
export type Place = z.infer<typeof PlaceSchema>

// Review schema (for database storage - required fields match DB schema)
export const ReviewSchema = z.object({
  name: z.string(),
  text: LocalizedTextSchema.optional(),
  originalText: LocalizedTextSchema.optional(),
  rating: z.number().min(1).max(5),
  authorAttribution: z
    .object({
      displayName: z.string().optional(),
      uri: z.string().optional(),
      photoUri: z.string().optional(),
    })
    .optional(),
  publishTime: z.string(),
  googleMapsUri: z.string(),
})
export type Review = z.infer<typeof ReviewSchema>

// Review schema for API responses (optional fields for flexible display)
export const ReviewResponseSchema = z.object({
  name: z.string().optional(),
  relativePublishTimeDescription: z.string().optional(),
  rating: z.number().optional(),
  text: LocalizedTextSchema.optional(),
  originalText: LocalizedTextSchema.optional(),
  authorAttribution: z
    .object({
      displayName: z.string().optional(),
      uri: z.string().optional(),
      photoUri: z.string().optional(),
    })
    .optional(),
  publishTime: z.string().optional(),
})
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>

// Status schema
export const StatusSchema = z.object({
  status: StatusEnum,
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Status = z.infer<typeof StatusSchema>

// ============================================================================
// Sorting Configuration
// ============================================================================

/**
 * Valid sort columns for user places queries.
 * These map to database columns in the backend.
 */
export const USER_PLACES_SORT_COLUMNS = [
  'name',
  'rating',
  'ratingCount',
  'status',
  'country',
  'locality',
  'postalCode',
  'createdAt',
  'updatedAt',
  'lastInteractionAt',
  'dateOfCreation',
  'domainRegisteredAt',
  'workforceRange',
  'primaryType',
  'website',
  'searchPlaceCreatedAt', // Internal: used for search views to preserve enrichment score
  'relevance', // Semantic search relevance score
] as const

export type UserPlacesSortColumn = (typeof USER_PLACES_SORT_COLUMNS)[number]

/**
 * Default sort configuration for user places queries
 */
export const USER_PLACES_DEFAULT_SORT = {
  sortBy: 'createdAt' as UserPlacesSortColumn,
  sortOrder: 'desc' as const,
} as const

/**
 * Compute the effective sort column based on context.
 * For search views, default/createdAt sorting uses searchPlaceCreatedAt
 * to preserve the enrichment score ordering from the search results.
 *
 * IMPORTANT: This logic must be used consistently in:
 * - Main user places query (getAggregatedUserPlaces)
 * - Item page lookup query (getFilteredPlaceIds)
 *
 * @param sortBy - The requested sort column (may be undefined)
 * @param searchId - The search ID if viewing search results
 * @returns The effective sort column to use
 */
export const getEffectiveSortColumn = (
  sortBy: string | undefined,
  searchId: string | undefined,
): UserPlacesSortColumn => {
  // For search views: use searchPlaceCreatedAt when sortBy is undefined or 'createdAt'
  // This preserves the enrichment score ordering from search results
  if (searchId && (!sortBy || sortBy === 'createdAt')) {
    return 'searchPlaceCreatedAt'
  }
  // For other cases, use the provided sortBy or fall back to default
  return (sortBy as UserPlacesSortColumn) || USER_PLACES_DEFAULT_SORT.sortBy
}

// ============================================================================
// Frontend Data Table Types
// ============================================================================

export type SearchResult = Place
export type EnrichmentState = {
  success: boolean
  data?: Record<string, unknown>
}

// UI-specific type that extends EnrichmentState with loading states
export type EnrichmentWithStatus = EnrichmentState & {
  isLoading?: boolean
  error?: string
}

// ============================================================================
// Place API Response Types
// ============================================================================

// Request schema
export const GetPlaceRequestParamsSchema = z.object({
  userPlaceId: z.string().uuid(),
})

// Response schema (success)
export const GetPlaceResponseSchema = z.object({
  place: PlaceSchema,
})

// API response (success | error)
export const GetPlaceApiResponseSchema = z.union([
  GetPlaceResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type GetPlaceRequestParams = z.infer<typeof GetPlaceRequestParamsSchema>
export type GetPlaceResponse = z.infer<typeof GetPlaceResponseSchema>
export type GetPlaceApiResponse = z.infer<typeof GetPlaceApiResponseSchema>
