import express, { type Router } from 'express'
import { enrichWebsite } from './enrich'
import listsRouter from './lists'
import { searchPlaces } from './places'

const router: Router = express.Router()

// Places routes
router.post('/places/search', searchPlaces)
router.get('/enrich', enrichWebsite)

// Lists routes
router.use('/lists', listsRouter)

export default router
