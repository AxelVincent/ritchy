import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../../shared'

// Params schema
export const DeleteNoteParamsSchema = z.object({
  userPlaceId: z.string(),
  noteId: z.string().uuid(),
})

// Response schema (success)
export const DeleteNoteResponseSchema = z.object({
  success: z.boolean(),
})

// API response (success | error)
export const DeleteNoteApiResponseSchema = z.union([
  DeleteNoteResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type DeleteNoteParams = z.infer<typeof DeleteNoteParamsSchema>
export type DeleteNoteResponse = z.infer<typeof DeleteNoteResponseSchema>
export type DeleteNoteApiResponse = z.infer<typeof DeleteNoteApiResponseSchema>
