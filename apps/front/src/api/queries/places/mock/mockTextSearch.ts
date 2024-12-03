interface Location {
  latitude: number
  longitude: number
}

interface Circle {
  center: Location
  radius: number
}

interface LocationBias {
  circle: Circle
}

interface TextSearchRequest {
  textQuery: string
  pageSize?: number
  locationBias?: LocationBias
}

interface ApiResponse {
  places: Place[]
  contextualContents: ContextualContent[]
  nextPageToken: string
  searchUri: string
}

interface Place {
  name: string
  id: string
  types: string[]
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  formattedAddress: string
  addressComponents: AddressComponent[]
  plusCode: PlusCode
  location: Location
  viewport: Viewport
  rating?: number
  googleMapsUri: string
  websiteUri?: string
  regularOpeningHours?: OpeningHours
  utcOffsetMinutes: number
  adrFormatAddress: string
  businessStatus: string
  userRatingCount?: number
  iconMaskBaseUri: string
  iconBackgroundColor: string
  displayName: DisplayName
  currentOpeningHours?: OpeningHours
  shortFormattedAddress: string
  reviews?: Review[]
  photos?: Photo[]
  accessibilityOptions?: AccessibilityOptions
  addressDescriptor?: AddressDescriptor
  googleMapsLinks: GoogleMapsLinks
}

interface AddressComponent {
  longText: string
  shortText: string
  types: string[]
  languageCode: string
}

interface PlusCode {
  globalCode: string
  compoundCode: string
}

interface Location {
  latitude: number
  longitude: number
}

interface Viewport {
  low: Location
  high: Location
}

interface OpeningHours {
  openNow: boolean
  periods: Period[]
  weekdayDescriptions: string[]
}

interface Period {
  open: TimeSlot
  close: TimeSlot
}

interface TimeSlot {
  day: number
  hour: number
  minute: number
  date?: DateInfo
}

interface DateInfo {
  year: number
  month: number
  day: number
}

interface DisplayName {
  text: string
  languageCode: string
}

interface Review {
  name: string
  relativePublishTimeDescription: string
  rating: number
  text: DisplayName
  originalText: DisplayName
  authorAttribution: AuthorAttribution
  publishTime: string
  flagContentUri: string
  googleMapsUri: string
}

interface AuthorAttribution {
  displayName: string
  uri: string
  photoUri: string
}

interface Photo {
  name: string
  widthPx: number
  heightPx: number
  authorAttributions: AuthorAttribution[]
  flagContentUri: string
  googleMapsUri: string
}

interface AccessibilityOptions {
  wheelchairAccessibleParking?: boolean
  wheelchairAccessibleEntrance?: boolean
}

interface AddressDescriptor {
  landmarks: Landmark[]
}

interface Landmark {
  name: string
  placeId: string
  displayName: DisplayName
  types: string[]
  straightLineDistanceMeters: number
  travelDistanceMeters: number
}

interface GoogleMapsLinks {
  directionsUri: string
  placeUri: string
  writeAReviewUri: string
  reviewsUri: string
  photosUri: string
}

interface ContextualContent {
  photos?: Photo[]
}

export const createMockTextSearchAPI = () => {
  const textSearch = async (
    request: TextSearchRequest,
  ): Promise<ApiResponse> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Generate number of places based on pageSize (default to 5)
    const count = request.pageSize || 5

    // Generate mock places based on the search query
    const places: Place[] = Array.from({ length: count }, (_, index) => ({
      id: `place_${index}_${Date.now()}`,
      name: `${request.textQuery} Location ${index + 1}`,
      displayName: {
        text: `${request.textQuery} Location ${index + 1}`,
        languageCode: 'en',
      },
      formattedAddress: `${100 + index} Mock Street, ${request.textQuery.split(' ')[0]}, ST 12345, USA`,
      adrFormatAddress: `${100 + index} Mock Street, ${request.textQuery.split(' ')[0]}, ST 12345, USA`,
      location: request.locationBias
        ? {
            latitude:
              request.locationBias.circle.center.latitude +
              (Math.random() - 0.5) * 0.01,
            longitude:
              request.locationBias.circle.center.longitude +
              (Math.random() - 0.5) * 0.01,
          }
        : {
            latitude: 32.7809617 + (Math.random() - 0.5) * 0.1,
            longitude: -79.9310849 + (Math.random() - 0.5) * 0.1,
          },
      addressComponents: [],
      plusCode: {
        globalCode: 'mock-global-code',
        compoundCode: 'mock-compound-code',
      },
      viewport: {
        low: { latitude: 32.7, longitude: -79.9 },
        high: { latitude: 32.8, longitude: -79.8 },
      },
      googleMapsLinks: {
        directionsUri: 'mock-uri',
        placeUri: 'mock-uri',
        writeAReviewUri: 'mock-uri',
        reviewsUri: 'mock-uri',
        photosUri: 'mock-uri',
      },
      rating: 3 + Math.random() * 2,
      userRatingCount: Math.floor(Math.random() * 500),
      types: ['restaurant', 'food', 'point_of_interest'],
      businessStatus: 'OPERATIONAL',
      googleMapsUri: `https://maps.google.com/?cid=${Date.now()}${index}`,
      websiteUri: `http://www.${request.textQuery.toLowerCase().replace(/\s+/g, '')}.com`,
      formattedPhoneNumber: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      shortFormattedAddress: `${100 + index} Mock Street`,
      iconMaskBaseUri:
        'https://maps.gstatic.com/mapfiles/place_api/icons/v2/restaurant_pinlet',
      iconBackgroundColor: '#FF9E67',
      utcOffsetMinutes: -240,
    }))

    return {
      places,
      contextualContents: [],
      nextPageToken: `mock_next_page_${Date.now()}`,
      searchUri: `https://www.google.com/maps/search/${encodeURIComponent(request.textQuery)}`,
    }
  }

  return { textSearch }
}

export default createMockTextSearchAPI
