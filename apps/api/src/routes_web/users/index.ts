import express, { type Router } from 'express'
import { getMe } from './get_me'

const router: Router = express.Router()

router.get('/me', getMe)

export default router
