import express, { type Router } from 'express'
import { addPlaceNote } from './create'
import { getPlaceNotes } from './list'

const notesRouter: Router = express.Router()

notesRouter.get('/:placeId/notes', getPlaceNotes)
notesRouter.post('/:placeId/notes', addPlaceNote)

export default notesRouter
