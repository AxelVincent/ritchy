import { z } from 'zod'
import { OpeningHoursSchema } from '../api/places'

export const searchResultSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  websiteUri: z.string(),
  googleMapsUri: z.string(),
  types: z.array(z.string()),
  internationalPhoneNumber: z.string().optional(),
  rating: z.number().optional(),
  userRatingCount: z.number().optional(),
  formattedAddress: z.string().optional(),
  regularOpeningHours: OpeningHoursSchema.optional(),
  utcOffsetMinutes: z.number().optional(),
})

export type SearchResult = z.infer<typeof searchResultSchema>
