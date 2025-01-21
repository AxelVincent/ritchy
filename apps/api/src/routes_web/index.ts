import express, { type Router } from 'express'
import { enrichWebsite } from './enrich'
import listsRouter from './lists'
import placesRouter from './places'

const router: Router = express.Router()

// Places routes
router.get('/enrich', enrichWebsite)

// Lists routes
router.use('/lists', listsRouter)

// Places routes
router.use('/places', placesRouter)

export default router
