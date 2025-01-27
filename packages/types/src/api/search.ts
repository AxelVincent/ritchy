import { z } from 'zod'

export const searchHistoryItemSchema = z.object({
  id: z.string().uuid(),
  location_formatted: z.string().min(1),
  keyword: z.string().min(1),
  created_at: z.date(),
  updated_at: z.date(),
})

export const searchHistorySchema = z.array(searchHistoryItemSchema)

export type SearchHistoryItem = z.infer<typeof searchHistoryItemSchema>
export type SearchHistory = z.infer<typeof searchHistorySchema>
