import express, { type Router } from 'express'
import notesRouter from './notes'
import statusRouter from './status'

const placesRouter: Router = express.Router({ mergeParams: true })

placesRouter.use('/:placeId/status', statusRouter)

placesRouter.use('/:placeId/notes', notesRouter)

export default placesRouter
