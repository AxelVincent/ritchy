import type { z } from 'zod'
import { PlaceSchema } from '../api/places'

export const searchResultSchema = PlaceSchema

export type SearchResult = z.infer<typeof searchResultSchema>
