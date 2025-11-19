import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const NotesParamsSchema = z.object({
  userPlaceId: z.string(),
})

export const NoteParamsSchema = z.object({
  userPlaceId: z.string(),
  noteId: z.string().uuid(),
})

// Basic Schema
export const NoteSchema = z.object({
  id: z.string().uuid(),
  userPlaceId: z.string(),
  note: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const NotesResponseSchema = z.array(NoteSchema)

export const AddNoteBodySchema = z.object({
  note: z.string().min(1),
})

export const UpdateNoteBodySchema = z.object({
  note: z.string().min(1),
})

// Request Schemas
export const AddNoteRequestSchema = z.intersection(
  NotesParamsSchema,
  AddNoteBodySchema,
)

export const UpdateNoteRequestSchema = z.intersection(
  NoteParamsSchema,
  UpdateNoteBodySchema,
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

export const UpdateNoteApiResponseSchema = z.union([
  NoteSchema,
  ApiErrorResponseSchema,
])

export const DeleteNoteApiResponseSchema = z.union([
  z.object({ success: z.boolean() }),
  ApiErrorResponseSchema,
])

// Type Inferences
export type Note = z.infer<typeof NoteSchema>
export type NotesResponse = z.infer<typeof NotesResponseSchema>
export type NotesApiResponse = z.infer<typeof NotesApiResponseSchema>
export type AddNoteRequest = z.infer<typeof AddNoteRequestSchema>
export type AddNoteApiResponse = z.infer<typeof AddNoteApiResponseSchema>
export type UpdateNoteRequest = z.infer<typeof UpdateNoteRequestSchema>
export type UpdateNoteApiResponse = z.infer<typeof UpdateNoteApiResponseSchema>
export type DeleteNoteRequest = z.infer<typeof NoteParamsSchema>
export type DeleteNoteApiResponse = z.infer<typeof DeleteNoteApiResponseSchema>
export type GetNotesRequest = z.infer<typeof NotesParamsSchema>
