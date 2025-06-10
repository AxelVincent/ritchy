import express, { type Router } from 'express'
import { ensureDemoCodeValidated } from '../middleware/ensure_demo_code_validated'
import { enrichWebsite } from './enrich'
import hubspotRouter from './hubspot'
import listsRouter from './lists'
import paymentsRouter from './payments'
import placesRouter from './places'
import searchesRouter from './searches'
import usersRouter from './users'

const router: Router = express.Router()

// Places routes
router.get('/enrich', ensureDemoCodeValidated, enrichWebsite)

// Lists routes
router.use('/lists', ensureDemoCodeValidated, listsRouter)

// Searches routes
router.use('/searches', ensureDemoCodeValidated, searchesRouter)

// Places routes
router.use('/places', ensureDemoCodeValidated, placesRouter)

// Payments routes
router.use('/payments', paymentsRouter)

// Users routes
router.use('/users', usersRouter)

// HubSpot routes
router.use('/hubspot', hubspotRouter)

export default router
