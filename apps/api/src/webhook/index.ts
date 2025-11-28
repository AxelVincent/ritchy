import express, { type Router } from 'express'

import { clerkWebhook } from './clerk'
import { stripeWebhook } from './stripe'

const webhookRoutes: Router = express.Router()

// Apply raw body parsing first - needed for webhook validation
webhookRoutes.use(express.raw({ type: 'application/json' }))

webhookRoutes.post('/stripe', stripeWebhook)
webhookRoutes.post('/clerk', clerkWebhook)

export default webhookRoutes
