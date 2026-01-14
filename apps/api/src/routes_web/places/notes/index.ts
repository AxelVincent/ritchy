import express, { type Router } from 'express'
import { validateRequest } from '../../../middleware/zodValidation'

// Import contracts
import {
  CreateNoteApiResponseSchema,
  CreateNoteBodySchema,
  CreateNoteParamsSchema,
} from './create-note/contract'
import {
  DeleteNoteApiResponseSchema,
  DeleteNoteParamsSchema,
} from './delete-note/contract'
import {
  ListNotesApiResponseSchema,
  ListNotesParamsSchema,
} from './list-notes/contract'
import {
  UpdateNoteApiResponseSchema,
  UpdateNoteBodySchema,
  UpdateNoteParamsSchema,
} from './update-note/contract'

// Import handlers
import { createNoteHandler } from './create-note/create-note'
import { deleteNoteHandler } from './delete-note/delete-note'
import { listNotesHandler } from './list-notes/list-notes'
import { updateNoteHandler } from './update-note/update-note'

const notesRouter: Router = express.Router({ mergeParams: true })

notesRouter.get(
  '/',
  validateRequest({
    paramsSchema: ListNotesParamsSchema,
    responseSchema: ListNotesApiResponseSchema,
  }),
  listNotesHandler,
)

notesRouter.post(
  '/',
  validateRequest({
    paramsSchema: CreateNoteParamsSchema,
    bodySchema: CreateNoteBodySchema,
    responseSchema: CreateNoteApiResponseSchema,
  }),
  createNoteHandler,
)

notesRouter.patch(
  '/:noteId',
  validateRequest({
    paramsSchema: UpdateNoteParamsSchema,
    bodySchema: UpdateNoteBodySchema,
    responseSchema: UpdateNoteApiResponseSchema,
  }),
  updateNoteHandler,
)

notesRouter.delete(
  '/:noteId',
  validateRequest({
    paramsSchema: DeleteNoteParamsSchema,
    responseSchema: DeleteNoteApiResponseSchema,
  }),
  deleteNoteHandler,
)

export default notesRouter
