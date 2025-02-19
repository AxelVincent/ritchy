import express, { type Router } from 'express'
import { getSubscription } from './get_subscription'

const router: Router = express.Router()

router.get('/subscription', getSubscription)

export default router
