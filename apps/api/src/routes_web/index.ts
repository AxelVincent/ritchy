import express, { type Router } from 'express'
import { enrichWebsite } from './enrich'
import { searchPlaces } from './places'

const router: Router = express.Router()

// Healthcheck route
router.get('/health', (req, res) => {
  console.log('Healthcheck route called', { url: req.url, method: req.method })
  res.status(200).json({ status: 'ok' })
})

// Places routes
router.post('/places/search', searchPlaces)
router.get('/enrich', enrichWebsite)

export default router
