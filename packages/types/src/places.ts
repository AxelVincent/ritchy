import { z } from 'zod'

// Base schemas
export const LocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number()
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
  textQuery: z.string().min(1),
  locationBias: z.object({
    circle: z.object({
      center: LocationSchema,
      radius: z.number().positive()
    })
  }),
  nextPageToken: z.string().optional(),
  pageSize: z.number().positive()
})

export const SearchResponseSchema = PlaceResultSchema.array()

// Type inference from schemas
export type SearchRequestBody = z.infer<typeof SearchRequestBodySchema>
export type SearchResponse = z.infer<typeof SearchResponseSchema>
export type PlaceResult = z.infer<typeof PlaceResultSchema>
export type PlacesApiResponse = z.infer<typeof PlacesApiResponseSchema>

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
  open: TimeSlotSchema,
  close: TimeSlotSchema
})

export const OpeningHoursSchema = z.object({
  openNow: z.boolean(),
  periods: z.array(PeriodSchema),
  weekdayDescriptions: z.array(z.string())
})

export const DisplayNameSchema = z.object({
  text: z.string(),
  languageCode: z.string()
})

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

export const LandmarkSchema = z.object({
  name: z.string(),
  placeId: z.string(),
  displayName: DisplayNameSchema,
  types: z.array(z.string()),
  straightLineDistanceMeters: z.number(),
  travelDistanceMeters: z.number().optional()
})

export const AddressComponentSchema = z.object({
  longText: z.string(),
  shortText: z.string(),
  types: z.array(z.string()),
  languageCode: z.string()
})

export const ViewportSchema = z.object({
  low: LocationSchema,
  high: LocationSchema
})

export const GoogleMapsLinksSchema = z.object({
  directionsUri: z.string(),
  placeUri: z.string(),
  writeAReviewUri: z.string(),
  reviewsUri: z.string(),
  photosUri: z.string()
})

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
      landmarks: z.array(LandmarkSchema)
    })
    .optional(),
  googleMapsLinks: GoogleMapsLinksSchema
})

export const TextSearchResponseSchema = z.object({
  places: z.array(PlaceSchema),
  contextualContents: z.array(
    z.object({
      photos: z.array(PhotoSchema).optional()
    })
  ),
  nextPageToken: z.string(),
  searchUri: z.string()
})

// Add type inference
export type TextSearchResponse = z.infer<typeof TextSearchResponseSchema>
export type Place = z.infer<typeof PlaceSchema>
