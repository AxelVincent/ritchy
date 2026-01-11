import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../../shared'

// Params schema
export const CreateNoteParamsSchema = z.object({
  userPlaceId: z.string(),
})

// Body schema
export const CreateNoteBodySchema = z.object({
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
export const CreateNoteApiResponseSchema = z.union([
  NoteSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type CreateNoteParams = z.infer<typeof CreateNoteParamsSchema>
export type CreateNoteBody = z.infer<typeof CreateNoteBodySchema>
export type Note = z.infer<typeof NoteSchema>
export type CreateNoteApiResponse = z.infer<typeof CreateNoteApiResponseSchema>
