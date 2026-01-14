import { Router, type Router as RouterType } from 'express'
import { apiKeyAuth } from '../middleware/api_key_auth'
import v1Router from './v1'

const router: RouterType = Router()

// All API routes require API key authentication
router.use(apiKeyAuth)

// Mount versioned routers
router.use('/v1', v1Router)

export default router
