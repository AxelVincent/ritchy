import express, { type Router } from 'express'
import notesRouter from './notes'
import reviewsRouter from './reviews'
import statusRouter from './status'

const placesRouter: Router = express.Router({ mergeParams: true })

placesRouter.use('/:placeId/status', statusRouter)

placesRouter.use('/:placeId/notes', notesRouter)

placesRouter.use('/:placeId/reviews', reviewsRouter)

export default placesRouter
