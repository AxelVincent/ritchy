import { z } from 'zod'
import { RectangleSchema } from './common'
import { SearchModelEnum } from './enums'

// ============================================================================
// Search Types
// ============================================================================

// Single search item schema
export const SearchItemSchema = z.object({
  id: z.string().uuid(),
  locationFormatted: z.string(),
  keyword: z.string().min(1),
  model: SearchModelEnum,
  rectangle: RectangleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Search is an array of SearchItems (used in components like nav-history)
export const SearchSchema = z.array(SearchItemSchema)

export type SearchItem = z.infer<typeof SearchItemSchema>
export type Search = z.infer<typeof SearchSchema>
