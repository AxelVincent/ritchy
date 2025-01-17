import express, { type Router } from 'express'
import notesRouter from './notes'
import searchRouter from './search'

const placesRouter: Router = express.Router()

placesRouter.use('/search', searchRouter)

placesRouter.use('', notesRouter)

export default placesRouter
