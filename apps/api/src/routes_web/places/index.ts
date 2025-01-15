import express, { type Router } from 'express'
import notesRouter from './notes'
import { searchPlaces } from './search'

const placesRouter: Router = express.Router()

placesRouter.post('/search', searchPlaces)

placesRouter.use('', notesRouter)

export default placesRouter
