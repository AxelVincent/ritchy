import { Router } from 'express'
import { enrichWebsite } from './enrich'
import { searchPlaces } from './places'

const router = Router()

// Places routes
router.post('/places/search', searchPlaces)
router.get('/enrich', enrichWebsite)

export default router
