import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../../shared'

// Params schema
export const ListNotesParamsSchema = z.object({
  userPlaceId: z.string(),
})

// Note schema
export const NoteSchema = z.object({
  id: z.string().uuid(),
  userPlaceId: z.string(),
  note: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Response schema (success)
export const ListNotesResponseSchema = z.array(NoteSchema)

// API response (success | error)
export const ListNotesApiResponseSchema = z.union([
  ListNotesResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type ListNotesParams = z.infer<typeof ListNotesParamsSchema>
export type Note = z.infer<typeof NoteSchema>
export type ListNotesResponse = z.infer<typeof ListNotesResponseSchema>
export type ListNotesApiResponse = z.infer<typeof ListNotesApiResponseSchema>
