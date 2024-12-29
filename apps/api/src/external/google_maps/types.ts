import { LocationSchema, OpeningHoursSchema } from '@ritchy/types'
import { z } from 'zod'

const LocalizedTextSchema = z.object({
  text: z.string(),
  languageCode: z.string(),
})

const AddressComponentSchema = z.object({
  longText: z.string(),
  shortText: z.string(),
  types: z.array(z.string()),
  languageCode: z.string(),
})

const PlusCodeSchema = z.object({
  globalCode: z.string(),
  compoundCode: z.string(),
})

const LatLngSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

const ViewportSchema = z.object({
  low: LatLngSchema,
  high: LatLngSchema,
})

const ReviewSchema = z.object({
  name: z.string(),
  relativePublishTimeDescription: z.string(),
  text: LocalizedTextSchema,
  originalText: LocalizedTextSchema,
  rating: z.number().min(1).max(5),
  authorAttribution: z.object({
    displayName: z.string(),
    uri: z.string(),
    photoUri: z.string(),
  }),
  publishTime: z.string(),
  flagContentUri: z.string(),
  googleMapsUri: z.string(),
})

const PhotoSchema = z.object({
  name: z.string(),
  widthPx: z.number(),
  heightPx: z.number(),
  authorAttributions: z.array(
    z.object({
      displayName: z.string(),
      uri: z.string().optional(),
      photoUri: z.string().optional(),
    }),
  ),
  flagContentUri: z.string().optional(),
  googleMapsUri: z.string(),
})

const FuelTypeEnum = z.enum([
  'FUEL_TYPE_UNSPECIFIED',
  'DIESEL',
  'REGULAR_UNLEADED',
  'MIDGRADE',
  'PREMIUM',
  'SP91',
  'SP91_E10',
  'SP92',
  'SP95',
  'SP95_E10',
  'SP98',
  'SP99',
  'SP100',
  'LPG',
  'E80',
  'E85',
  'METHANE',
  'BIO_DIESEL',
  'TRUCK_DIESEL',
])

const MoneySchema = z.object({
  currencyCode: z.string(),
  units: z.string(),
  nanos: z.number().optional(),
})

const FuelPriceSchema = z.object({
  type: FuelTypeEnum,
  price: MoneySchema,
  updateTime: z.string().datetime(),
})

const EVConnectorTypeEnum = z.enum([
  'EV_CONNECTOR_TYPE_UNSPECIFIED',
  'EV_CONNECTOR_TYPE_OTHER',
  'EV_CONNECTOR_TYPE_J1772',
  'EV_CONNECTOR_TYPE_TYPE_2',
  'EV_CONNECTOR_TYPE_CHADEMO',
  'EV_CONNECTOR_TYPE_CCS_COMBO_1',
  'EV_CONNECTOR_TYPE_CCS_COMBO_2',
  'EV_CONNECTOR_TYPE_TESLA',
  'EV_CONNECTOR_TYPE_UNSPECIFIED_GB_T',
  'EV_CONNECTOR_TYPE_UNSPECIFIED_WALL_OUTLET',
])

const ConnectorAggregationSchema = z.object({
  type: EVConnectorTypeEnum,
  maxChargeRateKw: z.number(),
  count: z.number().int(),
  availabilityLastUpdateTime: z.string().datetime(),
  availableCount: z.number().int(),
  outOfServiceCount: z.number().int(),
})

const ContentBlockSchema = z.object({
  topic: z.string(),
  content: LocalizedTextSchema,
  references: z.object({
    reviews: z.array(ReviewSchema).optional(),
    places: z.array(z.string()).optional(),
  }),
})

const SpatialRelationshipEnum = z.enum([
  'NEAR',
  'WITHIN',
  'BESIDE',
  'ACROSS_THE_ROAD',
  'DOWN_THE_ROAD',
  'AROUND_THE_CORNER',
  'BEHIND',
])

const ContainmentEnum = z.enum([
  'CONTAINMENT_UNSPECIFIED',
  'WITHIN',
  'OUTSKIRTS',
  'NEAR',
])

const LandmarkSchema = z.object({
  name: z.string(),
  placeId: z.string(),
  displayName: LocalizedTextSchema,
  types: z.array(z.string()),
  spatialRelationship: SpatialRelationshipEnum.optional(),
  straightLineDistanceMeters: z.number().optional(),
  travelDistanceMeters: z.number().optional(),
})

const AreaSchema = z.object({
  name: z.string(),
  placeId: z.string(),
  displayName: LocalizedTextSchema,
  containment: ContainmentEnum,
})

const GoogleMapsLinksSchema = z.object({
  directionsUri: z.string().optional(),
  placeUri: z.string().optional(),
  writeAReviewUri: z.string().optional(),
  reviewsUri: z.string().optional(),
  photosUri: z.string().optional(),
})

const AddressDescriptorSchema = z.object({
  landmarks: z.array(LandmarkSchema).optional(),
  areas: z.array(AreaSchema).optional(),
})

const AreaSummarySchema = z.object({
  contentBlocks: z.array(ContentBlockSchema),
  flagContentUri: z.string(),
})

// Stage 0 - Base Place Information
const IDSOnlyPlaceSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  photos: z.array(PhotoSchema).optional(),
  attributions: z
    .array(z.object({ provider: z.string(), providerUri: z.string() }))
    .optional(),
})

// Stage 1 - Core Place Information
const LocationOnlyPlaceSchema = IDSOnlyPlaceSchema.extend({
  addressComponents: z.array(AddressComponentSchema).optional(),
  adrFormatAddress: z.string().optional(),
  formattedAddress: z.string().optional(),
  location: LatLngSchema.optional(),
  plusCode: PlusCodeSchema.optional(),
  shortFormattedAddress: z.string().optional(),
  types: z.array(z.string()).optional(),
  viewport: ViewportSchema.optional(),
})

// Stage 2 - Basic Place Information
const BasicPlaceSchema = LocationOnlyPlaceSchema.extend({
  displayName: LocalizedTextSchema.optional(),
  primaryType: z.string().optional(),
  primaryTypeDisplayName: LocalizedTextSchema.optional(),
  accessibilityOptions: z
    .object({
      wheelchairAccessibleParking: z.boolean().optional(),
      wheelchairAccessibleEntrance: z.boolean().optional(),
      wheelchairAccessibleRestroom: z.boolean().optional(),
      wheelchairAccessibleSeating: z.boolean().optional(),
    })
    .optional(),
  businessStatus: z
    .enum(['OPERATIONAL', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY'])
    .optional(),
  googleMapsLinks: GoogleMapsLinksSchema.optional(),
  googleMapsUri: z.string().optional(),
  iconBackgroundColor: z.string().optional(),
  iconMaskBaseUri: z.string().optional(),
  pureServiceAreaBusiness: z.boolean().optional(),
  subDestinations: z
    .array(z.object({ name: z.string(), id: z.string() }))
    .optional(),
  utcOffsetMinutes: z.number().optional(),
  addressDescriptor: AddressDescriptorSchema.optional(),
})

// Stage 3 - Advanced Place Information
export const AdvancedPlaceSchema = BasicPlaceSchema.extend({
  currentOpeningHours: OpeningHoursSchema.optional(),
  currentSecondaryOpeningHours: z.array(OpeningHoursSchema).optional(),
  internationalPhoneNumber: z.string().optional(),
  nationalPhoneNumber: z.string().optional(),
  priceLevel: z
    .enum([
      'PRICE_LEVEL_FREE',
      'PRICE_LEVEL_INEXPENSIVE',
      'PRICE_LEVEL_MODERATE',
      'PRICE_LEVEL_EXPENSIVE',
      'PRICE_LEVEL_VERY_EXPENSIVE',
    ])
    .optional(),
  priceRange: z
    .object({
      startPrice: MoneySchema.optional(),
      endPrice: MoneySchema.optional(),
    })
    .optional(),
  rating: z.number().min(1).max(5).optional(),
  regularOpeningHours: OpeningHoursSchema.optional(),
  regularSecondaryOpeningHours: z.array(OpeningHoursSchema).optional(),
  userRatingCount: z.number().optional(),
  websiteUri: z.string().optional(),
})

// Stage 4 - Preferred (Complete) Place Information
const PreferredPlaceSchema = AdvancedPlaceSchema.extend({
  allowsDogs: z.boolean().optional(),
  curbsidePickup: z.boolean().optional(),
  delivery: z.boolean().optional(),
  dineIn: z.boolean().optional(),
  editorialSummary: LocalizedTextSchema.optional(),
  evChargeOptions: z
    .object({
      connectorCount: z.number().int().optional(),
      connectorAggregation: z.array(ConnectorAggregationSchema).optional(),
    })
    .optional(),
  fuelOptions: z
    .object({
      fuelPrices: z.array(FuelPriceSchema).optional(),
    })
    .optional(),
  goodForChildren: z.boolean().optional(),
  goodForGroups: z.boolean().optional(),
  goodForWatchingSports: z.boolean().optional(),
  liveMusic: z.boolean().optional(),
  menuForChildren: z.boolean().optional(),
  outdoorSeating: z.boolean().optional(),
  parkingOptions: z
    .object({
      freeParkingLot: z.boolean().optional(),
      paidParkingLot: z.boolean().optional(),
      freeStreetParking: z.boolean().optional(),
      paidStreetParking: z.boolean().optional(),
      valetParking: z.boolean().optional(),
      freeGarageParking: z.boolean().optional(),
      paidGarageParking: z.boolean().optional(),
    })
    .optional(),
  paymentOptions: z
    .object({
      acceptsCreditCards: z.boolean().optional(),
      acceptsDebitCards: z.boolean().optional(),
      acceptsCashOnly: z.boolean().optional(),
      acceptsNfc: z.boolean().optional(),
    })
    .optional(),
  reservable: z.boolean().optional(),
  restroom: z.boolean().optional(),
  reviews: z.array(ReviewSchema).optional(),
  servesBeer: z.boolean().optional(),
  servesBreakfast: z.boolean().optional(),
  servesBrunch: z.boolean().optional(),
  servesCocktails: z.boolean().optional(),
  servesCoffee: z.boolean().optional(),
  servesDessert: z.boolean().optional(),
  servesDinner: z.boolean().optional(),
  servesLunch: z.boolean().optional(),
  servesVegetarianFood: z.boolean().optional(),
  servesWine: z.boolean().optional(),
  takeout: z.boolean().optional(),
  areaSummary: AreaSummarySchema.optional(),
})

// API Request/Response Schemas
export const GooglePlacesTextSearchRequestBodySchema = z.object({
  textQuery: z.string().min(1),
  locationRestriction: z.object({
    rectangle: z.object({
      low: LocationSchema,
      high: LocationSchema,
    }),
  }),
  nextPageToken: z.string().optional(),
  resultsQuantity: z.number().positive(),
})

export const GooglePlacesTextSearchResponseSchema = z.object({
  places: z.array(AdvancedPlaceSchema).optional(),
  contextualContents: z
    .array(
      z.object({
        photos: z.array(PhotoSchema).optional(),
      }),
    )
    .optional(),
  nextPageToken: z.string().optional(),
  searchUri: z.string().optional(),
})

const generatePlaceKeys = (
  schema: z.ZodObject<z.ZodRawShape>,
  includePrefix = true,
) => {
  const prefix = includePrefix ? 'places.' : ''
  const placeKeys = Object.keys(schema.shape)
    .map((key) => `${prefix}${key}`)
    .join(',')

  return includePrefix
    ? `${placeKeys},contextualContents,nextPageToken,searchUri`
    : placeKeys
}

// Stage 0 keys
export const IDS_ONLY_PLACE_KEYS = generatePlaceKeys(IDSOnlyPlaceSchema)

// Stage 1 keys
export const LOCATION_ONLY_PLACE_KEYS = generatePlaceKeys(
  LocationOnlyPlaceSchema,
)

// Stage 2 keys
export const BASIC_PLACE_KEYS = generatePlaceKeys(BasicPlaceSchema)

// Stage 3 keys
export const ADVANCED_PLACE_KEYS_PLACE_DETAILS = generatePlaceKeys(
  AdvancedPlaceSchema,
  false,
)
export const ADVANCED_PLACE_KEYS_TEXT_SEARCH =
  generatePlaceKeys(AdvancedPlaceSchema)

// Stage 4 keys
export const PREFERRED_PLACE_KEYS = generatePlaceKeys(PreferredPlaceSchema)

// Type Inference for Place Stages
export type IDSOnlyPlace = z.infer<typeof IDSOnlyPlaceSchema>
export type LocationOnlyPlace = z.infer<typeof LocationOnlyPlaceSchema>
export type BasicPlace = z.infer<typeof BasicPlaceSchema>
export type AdvancedPlace = z.infer<typeof AdvancedPlaceSchema>
export type PreferredPlace = z.infer<typeof PreferredPlaceSchema>
export type AreaSummary = z.infer<typeof AreaSummarySchema>
export type AddressDescriptor = z.infer<typeof AddressDescriptorSchema>

// Type Inference for TextSearch Request/Response
export type GooglePlacesTextSearchRequestBody = z.infer<
  typeof GooglePlacesTextSearchRequestBodySchema
>
export type GooglePlacesTextSearchResponse = z.infer<
  typeof GooglePlacesTextSearchResponseSchema
>
