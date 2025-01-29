import express, { type Router } from 'express'
import { addPlaceNote } from './create'
import { getPlaceNotes } from './list'

const notesRouter: Router = express.Router()

notesRouter.get('/:placeId', getPlaceNotes)
notesRouter.post('/:placeId', addPlaceNote)

export default notesRouter
