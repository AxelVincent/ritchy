import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

// Basic Schema
export const NoteSchema = z.object({
  id: z.string().uuid(),
  placeId: z.string(),
  note: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const NotesResponseSchema = z.array(NoteSchema)

// Request Schemas
export const AddNoteRequestSchema = z.object({
  placeId: z.string(),
  note: z.string().min(1),
})

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
