import {
  AddNoteApiResponseSchema,
  AddNoteBodySchema,
  DeleteNoteApiResponseSchema,
  NoteParamsSchema,
  NotesApiResponseSchema,
  NotesParamsSchema,
  UpdateNoteApiResponseSchema,
  UpdateNoteBodySchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../../middleware/zodValidation'
import { addPlaceNote } from './create'
import { deletePlaceNote } from './delete'
import { getPlaceNotes } from './list'
import { updatePlaceNote } from './update'

const notesRouter: Router = express.Router({ mergeParams: true })

notesRouter.get(
  '/',
  validateRequest({
    paramsSchema: NotesParamsSchema,
    responseSchema: NotesApiResponseSchema,
  }),
  getPlaceNotes,
)

notesRouter.post(
  '/',
  validateRequest({
    paramsSchema: NotesParamsSchema,
    bodySchema: AddNoteBodySchema,
    responseSchema: AddNoteApiResponseSchema,
  }),
  addPlaceNote,
)

notesRouter.patch(
  '/:noteId',
  validateRequest({
    paramsSchema: NoteParamsSchema,
    bodySchema: UpdateNoteBodySchema,
    responseSchema: UpdateNoteApiResponseSchema,
  }),
  updatePlaceNote,
)

notesRouter.delete(
  '/:noteId',
  validateRequest({
    paramsSchema: NoteParamsSchema,
    responseSchema: DeleteNoteApiResponseSchema,
  }),
  deletePlaceNote,
)

export default notesRouter
