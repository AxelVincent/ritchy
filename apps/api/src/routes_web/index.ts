import express, { type Router } from 'express'
import { enrichWebsite } from './enrich'
import listsRouter from './lists'
import paymentsRouter from './payments'
import placesRouter from './places'
import searchesRouter from './searches'
import usersRouter from './users'

const router: Router = express.Router()

// Places routes
router.get('/enrich', enrichWebsite)

// Lists routes
router.use('/lists', listsRouter)

// Searches routes
router.use('/searches', searchesRouter)

// Payments routes
router.use('/payments', paymentsRouter)

// Places routes
router.use('/places', placesRouter)

// Users routes
router.use('/users', usersRouter)

export default router
