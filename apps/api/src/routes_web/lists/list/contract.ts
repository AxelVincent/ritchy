import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Response schema (success) - array of lists
export const ListResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  emoji: z.string(),
  itemCount: z.coerce.number(), // SQL COUNT returns bigint as string, need to coerce
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const ListsResponseSchema = z.array(ListResponseSchema)

// API response (success | error)
export const ListsApiResponseSchema = z.union([
  ListsResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type ListItem = z.infer<typeof ListResponseSchema>
export type ListsResponse = z.infer<typeof ListsResponseSchema>
export type ListsApiResponse = z.infer<typeof ListsApiResponseSchema>
