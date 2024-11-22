import { LocationSchema } from '@ritchy/types'
import { z } from 'zod'

// Basic/Common Schemas
export const DisplayNameSchema = z.object({
  text: z.string(),
  languageCode: z.string()
})

export const ViewportSchema = z.object({
  low: LocationSchema,
  high: LocationSchema
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
      day: z.number()
    })
    .optional()
})

export const PeriodSchema = z.object({
  open: TimeSlotSchema.optional(),
  close: TimeSlotSchema.optional()
})

export const OpeningHoursSchema = z.object({
  openNow: z.boolean(),
  periods: z.array(PeriodSchema),
  weekdayDescriptions: z.array(z.string())
})

// Attribution & Media Schemas
export const AuthorAttributionSchema = z.object({
  displayName: z.string(),
  uri: z.string(),
  photoUri: z.string().optional()
})

export const PhotoSchema = z.object({
  name: z.string(),
  widthPx: z.number(),
  heightPx: z.number(),
  authorAttributions: z.array(AuthorAttributionSchema),
  flagContentUri: z.string().optional(),
  googleMapsUri: z.string()
})

// Place-related Schemas
export const AddressComponentSchema = z.object({
  longText: z.string(),
  shortText: z.string(),
  types: z.array(z.string()),
  languageCode: z.string()
})

export const LandmarkSchema = z.object({
  name: z.string(),
  placeId: z.string(),
  displayName: DisplayNameSchema,
  types: z.array(z.string()),
  straightLineDistanceMeters: z.number(),
  travelDistanceMeters: z.number().optional()
})

export const ReviewSchema = z.object({
  name: z.string(),
  relativePublishTimeDescription: z.string(),
  rating: z.number(),
  text: DisplayNameSchema.optional(),
  originalText: DisplayNameSchema.optional(),
  authorAttribution: AuthorAttributionSchema,
  publishTime: z.string(),
  flagContentUri: z.string(),
  googleMapsUri: z.string()
})

export const GoogleMapsLinksSchema = z.object({
  directionsUri: z.string(),
  placeUri: z.string(),
  writeAReviewUri: z.string(),
  reviewsUri: z.string(),
  photosUri: z.string()
})

// Main Place Schema
export const PlaceSchema = z.object({
  name: z.string(),
  id: z.string(),
  types: z.array(z.string()),
  nationalPhoneNumber: z.string().optional(),
  internationalPhoneNumber: z.string().optional(),
  formattedAddress: z.string(),
  addressComponents: z.array(AddressComponentSchema),
  plusCode: z.object({
    globalCode: z.string(),
    compoundCode: z.string()
  }),
  location: LocationSchema,
  viewport: ViewportSchema,
  rating: z.number().optional(),
  googleMapsUri: z.string(),
  websiteUri: z.string().optional(),
  regularOpeningHours: OpeningHoursSchema.optional(),
  utcOffsetMinutes: z.number(),
  adrFormatAddress: z.string(),
  businessStatus: z.string(),
  userRatingCount: z.number().optional(),
  iconMaskBaseUri: z.string(),
  iconBackgroundColor: z.string(),
  displayName: DisplayNameSchema,
  currentOpeningHours: OpeningHoursSchema.optional(),
  shortFormattedAddress: z.string(),
  reviews: z.array(ReviewSchema).optional(),
  photos: z.array(PhotoSchema).optional(),
  accessibilityOptions: z
    .object({
      wheelchairAccessibleParking: z.boolean().optional(),
      wheelchairAccessibleEntrance: z.boolean().optional()
    })
    .optional(),
  addressDescriptor: z
    .object({
      landmarks: z.array(LandmarkSchema).optional()
    })
    .optional(),
  googleMapsLinks: GoogleMapsLinksSchema
})

// API Request/Response Schemas
export const TextSearchRequestBodySchema = z.object({
  textQuery: z.string().min(1),
  locationBias: z.object({
    circle: z.object({
      center: LocationSchema,
      radiusInMeters: z.number().positive()
    })
  }),
  nextPageToken: z.string().optional(),
  pageSize: z.number().positive()
})

export const TextSearchResponseSchema = z.object({
  places: z.array(PlaceSchema).optional(),
  contextualContents: z
    .array(
      z.object({
        photos: z.array(PhotoSchema).optional()
      })
    )
    .optional(),
  nextPageToken: z.string().optional(),
  searchUri: z.string().optional()
})

// Type Inference
export type DisplayName = z.infer<typeof DisplayNameSchema>
export type Viewport = z.infer<typeof ViewportSchema>
export type TimeSlot = z.infer<typeof TimeSlotSchema>
export type Period = z.infer<typeof PeriodSchema>
export type OpeningHours = z.infer<typeof OpeningHoursSchema>
export type AuthorAttribution = z.infer<typeof AuthorAttributionSchema>
export type Photo = z.infer<typeof PhotoSchema>
export type AddressComponent = z.infer<typeof AddressComponentSchema>
export type Landmark = z.infer<typeof LandmarkSchema>
export type Review = z.infer<typeof ReviewSchema>
export type GoogleMapsLinks = z.infer<typeof GoogleMapsLinksSchema>
export type Place = z.infer<typeof PlaceSchema>
export type TextSearchRequestBody = z.infer<typeof TextSearchRequestBodySchema>
export type TextSearchResponse = z.infer<typeof TextSearchResponseSchema>
