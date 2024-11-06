import { Router } from 'express'
import { searchPlaces } from './places'

const router = Router()

// Places routes
router.post('/places/search', searchPlaces)

export default router
