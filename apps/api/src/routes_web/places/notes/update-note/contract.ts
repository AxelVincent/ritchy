import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../../shared'

// Params schema
export const UpdateNoteParamsSchema = z.object({
  userPlaceId: z.string(),
  noteId: z.string().uuid(),
})

// Body schema
export const UpdateNoteBodySchema = z.object({
  note: z.string().min(1),
})

// Note schema (response)
export const NoteSchema = z.object({
  id: z.string().uuid(),
  userPlaceId: z.string(),
  note: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// API response (success | error)
export const UpdateNoteApiResponseSchema = z.union([
  NoteSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type UpdateNoteParams = z.infer<typeof UpdateNoteParamsSchema>
export type UpdateNoteBody = z.infer<typeof UpdateNoteBodySchema>
export type Note = z.infer<typeof NoteSchema>
export type UpdateNoteApiResponse = z.infer<typeof UpdateNoteApiResponseSchema>
