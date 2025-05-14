import express, { type Router } from 'express'
import { getMe } from './get_me'
import { validateDemoCodeHandler } from './post_validate_demo_code'

const router: Router = express.Router()

router.get('/me', getMe)
router.post('/validate-demo-code', validateDemoCodeHandler)

export default router
