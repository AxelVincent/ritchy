import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const NotesParamsSchema = z.object({
  userPlaceId: z.string(),
})

// Basic Schema
export const NoteSchema = z.object({
  id: z.string().uuid(),
  userPlaceId: z.string(),
  note: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const NotesResponseSchema = z.array(NoteSchema)

export const AddNoteBodySchema = z.object({
  note: z.string().min(1),
})

// Request Schemas
export const AddNoteRequestSchema = z.intersection(
  NotesParamsSchema,
  AddNoteBodySchema,
)

// Response Schemas with Error Handling
export const NotesApiResponseSchema = z.union([
  NotesResponseSchema,
  ApiErrorResponseSchema,
])

export const AddNoteApiResponseSchema = z.union([
  NoteSchema,
  ApiErrorResponseSchema,
])

// Type Inferences
export type Note = z.infer<typeof NoteSchema>
export type NotesResponse = z.infer<typeof NotesResponseSchema>
export type NotesApiResponse = z.infer<typeof NotesApiResponseSchema>
export type AddNoteRequest = z.infer<typeof AddNoteRequestSchema>
export type AddNoteApiResponse = z.infer<typeof AddNoteApiResponseSchema>
export type GetNotesRequest = z.infer<typeof NotesParamsSchema>
