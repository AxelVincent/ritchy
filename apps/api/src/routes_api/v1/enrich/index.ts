import { Router, type Router as RouterType } from 'express'
import { enrichCompanyHandler } from './company'

const router: RouterType = Router()

// POST /api/v1/enrich/company - Enrich a company
router.post('/company', enrichCompanyHandler)

export default router
