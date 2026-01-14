import { Router, type Router as RouterType } from 'express'
import enrichRouter from './enrich'
import { apiConcurrencyMiddleware } from './middleware/concurrency'
import { apiRateLimitMiddleware } from './middleware/rate_limit'

const router: RouterType = Router()

// Apply rate limiting and concurrency middleware to all v1 routes
router.use(apiRateLimitMiddleware)
router.use(apiConcurrencyMiddleware)

// Mount sub-routers
router.use('/enrich', enrichRouter)

export default router
