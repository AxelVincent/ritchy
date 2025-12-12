import express, { type Router } from 'express'
import contactsRouter from './contacts'
import enrichRouter from './enrich'
import listsRouter from './lists'
import paymentsRouter from './payments'
import placesRouter from './places'
import searchesRouter from './searches'
import userPlacesRouter from './user-places'
import usersRouter from './users'

const router: Router = express.Router()

// User places routes (unified endpoint for all leads)
router.use('/user-places', userPlacesRouter)

// Lists routes
router.use('/lists', listsRouter)

// Contacts routes
router.use('/contacts', contactsRouter)

// Searches routes
router.use('/searches', searchesRouter)

// Places routes
router.use('/places', placesRouter)

// Enrich routes
router.use('/enrich', enrichRouter)

// Payments routes
router.use('/payments', paymentsRouter)

// Users routes
router.use('/users', usersRouter)

export default router
