import {
  AddNoteApiResponseSchema,
  AddNoteBodySchema,
  NotesApiResponseSchema,
} from '@ritchy/types'
import { NotesParamsSchema } from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../../middleware/zodValidation'
import { addPlaceNote } from './create'
import { getPlaceNotes } from './list'

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

export default notesRouter
